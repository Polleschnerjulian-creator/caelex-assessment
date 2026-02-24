/**
 * Shared formatting utilities for Assure PDF report templates.
 */

/**
 * Format a number as EUR currency with thousand separators.
 * Example: 1500000 => "EUR 1,500,000"
 */
export function formatEUR(value: number | undefined | null): string {
  if (value == null) return "N/A";
  return `EUR ${value.toLocaleString("en-IE", { maximumFractionDigits: 0 })}`;
}

/**
 * Format a number as a compact EUR value (e.g. EUR 1.5M, EUR 250K).
 */
export function formatEURCompact(value: number | undefined | null): string {
  if (value == null) return "N/A";
  if (value >= 1_000_000_000) {
    return `EUR ${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `EUR ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `EUR ${(value / 1_000).toFixed(0)}K`;
  }
  return `EUR ${value.toLocaleString("en-IE", { maximumFractionDigits: 0 })}`;
}

/**
 * Format a percentage value. Input is a raw number (e.g. 75 => "75%").
 */
export function formatPercent(value: number | undefined | null): string {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}%`;
}

/**
 * Format a fraction as a percentage. Input is 0-1 (e.g. 0.75 => "75%").
 */
export function formatFraction(value: number | undefined | null): string {
  if (value == null) return "N/A";
  return `${(value * 100).toFixed(0)}%`;
}

/**
 * Format a date in a human-readable format.
 * Example: "24 February 2026"
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format a number with thousand separators.
 * Example: 15000 => "15,000"
 */
export function formatNumber(value: number | undefined | null): string {
  if (value == null) return "N/A";
  return value.toLocaleString("en-IE");
}

/**
 * Return a trend indicator as text: up arrow, down arrow, or flat dash.
 */
export function trendIndicator(trend: "up" | "down" | "flat"): string {
  switch (trend) {
    case "up":
      return "[UP]";
    case "down":
      return "[DOWN]";
    case "flat":
      return "[FLAT]";
    default:
      return "";
  }
}

/**
 * Generate a unique-ish report ID from a prefix.
 */
export function generateReportId(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}
