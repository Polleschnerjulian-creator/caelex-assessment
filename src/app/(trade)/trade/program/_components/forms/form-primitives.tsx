"use client";

/**
 * Trade-themed form primitives (Sprint E3b).
 *
 * Light-mode inputs matching the rest of the /trade workspace. Kept
 * deliberately small — no validation rendering, no aria-live, no
 * react-hook-form. Each section form composes these directly and
 * handles its own state via `useState`.
 */

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const labelClass =
  "block text-[11.5px] font-medium uppercase tracking-wide text-trade-text-muted";
const fieldClass =
  "mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent";

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> {
  label: string;
  value: string | undefined | null;
  onChange: (value: string) => void;
  helper?: string;
}

export function TextField({
  label,
  value,
  onChange,
  helper,
  ...rest
}: TextFieldProps) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        {...rest}
        className={fieldClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {helper && (
        <p className="mt-1 text-[11.5px] text-trade-text-muted">{helper}</p>
      )}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  helper?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  helper,
  ...rest
}: NumberFieldProps) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        {...rest}
        type="number"
        inputMode="decimal"
        className={fieldClass}
        value={value === null || value === undefined ? "" : value}
        onChange={(e) => onChange(e.target.value)}
      />
      {helper && (
        <p className="mt-1 text-[11.5px] text-trade-text-muted">{helper}</p>
      )}
    </div>
  );
}

interface DateFieldProps {
  label: string;
  value: Date | null | undefined;
  onChange: (value: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  // HTML <input type="date"> expects ISO YYYY-MM-DD.
  const iso = value ? new Date(value).toISOString().slice(0, 10) : "";
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="date"
        className={fieldClass}
        value={iso}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface BooleanFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  helper?: string;
}

export function BooleanField({
  label,
  value,
  onChange,
  helper,
}: BooleanFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <label className="inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-trade-border text-trade-accent focus:ring-trade-accent"
        />
      </label>
      <div className="-mt-0.5">
        <p className="text-[13px] font-medium text-trade-text-primary">
          {label}
        </p>
        {helper && (
          <p className="text-[11.5px] text-trade-text-muted">{helper}</p>
        )}
      </div>
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: SelectFieldProps) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        className={fieldClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder ?? "—"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
}

export function TextAreaField({
  label,
  value,
  onChange,
  ...rest
}: TextAreaFieldProps) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea
        {...rest}
        className={fieldClass}
        rows={rest.rows ?? 4}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface FormFooterProps {
  onCancel: () => void;
  isPending: boolean;
  error?: string;
}

export function FormFooter({ onCancel, isPending, error }: FormFooterProps) {
  return (
    <div className="mt-6 space-y-3">
      {error && (
        <p className="trade-chip-danger rounded-md px-3 py-2 text-[12.5px]">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md px-4 py-2 text-[13px] font-medium text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
