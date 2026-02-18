"use client";

import type { AssessmentField } from "@/lib/compliance/types";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

interface AssessmentFieldFormProps {
  fields: AssessmentField[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
}

export default function AssessmentFieldForm({
  fields,
  values,
  onChange,
}: AssessmentFieldFormProps) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(val) => onChange(field.id, val)}
        />
      ))}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: AssessmentField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const [showHelp, setShowHelp] = useState(false);

  const inputClasses =
    "w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.15] transition-colors";

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-[12px] text-slate-600 dark:text-white/60">
            {field.label}
          </label>
          {field.helpText && (
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className={`rounded-full p-0.5 transition-colors ${
                showHelp
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-slate-400 dark:text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10"
              }`}
              title="Show explanation"
            >
              <HelpCircle size={13} />
            </button>
          )}
        </div>

        {showHelp && field.helpText && (
          <div className="flex gap-2 mb-2 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
            <HelpCircle
              size={13}
              className="text-emerald-400/60 flex-shrink-0 mt-0.5"
            />
            <p className="text-[11px] text-emerald-300/70 leading-relaxed">
              {field.helpText}
            </p>
          </div>
        )}

        {field.type === "boolean" && (
          <button
            type="button"
            onClick={() => onChange(value === true ? false : true)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value === true
                ? "bg-green-500"
                : "bg-slate-200 dark:bg-white/[0.08]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                value === true ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        )}

        {field.type === "select" && (
          <select
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value || null)}
            className={inputClasses}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {field.type === "number" && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={value !== null && value !== undefined ? String(value) : ""}
              onChange={(e) =>
                onChange(e.target.value ? parseFloat(e.target.value) : null)
              }
              placeholder={field.placeholder}
              className={inputClasses}
            />
            {field.unit && (
              <span className="text-[11px] text-slate-500 dark:text-white/40 whitespace-nowrap">
                {field.unit}
              </span>
            )}
          </div>
        )}

        {field.type === "text" && (
          <input
            type="text"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={field.placeholder}
            className={inputClasses}
          />
        )}

        {field.type === "date" && (
          <input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value || null)}
            className={inputClasses}
          />
        )}
      </div>
    </div>
  );
}
