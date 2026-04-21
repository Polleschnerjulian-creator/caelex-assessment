"use client";

/**
 * StatusFlag — KeyCite / Shepard's-style regulatory status indicator.
 *
 * Compliance officers already speak this visual language: green = good
 * law, amber = amendment pending, red = superseded, hourglass = not yet
 * effective. Using icon + color + sr-only label is the WCAG-friendly
 * triple-channel approach (color alone would fail control-room
 * monochrome displays).
 *
 * Icons are inline SVG so they can respond to `currentColor`.
 */

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./primitives/Tooltip";
import { cn } from "@/lib/transparency/cn";

export type StatusKind =
  | "in-force"
  | "amended"
  | "superseded"
  | "effective-from";

interface StatusMeta {
  label: string;
  description: string;
  /** Tailwind text-color for the icon + ring. */
  tone: string;
  /** Icon renderer — receives the label for sr-only fallback. */
  Icon: React.FC<{ "aria-hidden"?: boolean }>;
}

const CIRCLE_CLASS = "w-3 h-3";

const CheckCircle: StatusMeta["Icon"] = (props) => (
  <svg
    viewBox="0 0 12 12"
    className={CIRCLE_CLASS}
    fill="currentColor"
    {...props}
  >
    <circle cx="6" cy="6" r="6" />
    <path
      d="M3.6 6.2l1.7 1.7 3.1-3.9"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const AmberTriangle: StatusMeta["Icon"] = (props) => (
  <svg
    viewBox="0 0 12 12"
    className={CIRCLE_CLASS}
    fill="currentColor"
    {...props}
  >
    <path d="M6 1 L11 10 L1 10 Z" />
    <rect x="5.3" y="4.8" width="1.4" height="2.6" fill="white" rx="0.5" />
    <rect x="5.3" y="8" width="1.4" height="1.4" fill="white" rx="0.5" />
  </svg>
);

const RedOctagon: StatusMeta["Icon"] = (props) => (
  <svg
    viewBox="0 0 12 12"
    className={CIRCLE_CLASS}
    fill="currentColor"
    {...props}
  >
    <path d="M4 0.5 L8 0.5 L11.5 4 L11.5 8 L8 11.5 L4 11.5 L0.5 8 L0.5 4 Z" />
    <rect x="3" y="5.3" width="6" height="1.4" fill="white" rx="0.5" />
  </svg>
);

const HourglassDot: StatusMeta["Icon"] = (props) => (
  <svg
    viewBox="0 0 12 12"
    className={CIRCLE_CLASS}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    {...props}
  >
    <circle cx="6" cy="6" r="5" />
    <path
      d="M6 3.5 L6 6 L7.8 7.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const STATUS_META: Record<StatusKind, StatusMeta> = {
  "in-force": {
    label: "In force",
    description: "This regulation is currently in force and actively enforced.",
    tone: "text-[--success-9]",
    Icon: CheckCircle,
  },
  amended: {
    label: "Amendment pending",
    description:
      "An amendment to this regulation has been proposed or is in transition. Review diligently.",
    tone: "text-[--warning-9]",
    Icon: AmberTriangle,
  },
  superseded: {
    label: "Superseded",
    description:
      "This regulation has been replaced. Cite the successor instead.",
    tone: "text-[--danger-9]",
    Icon: RedOctagon,
  },
  "effective-from": {
    label: "Effective from",
    description:
      "This regulation has been adopted but enforcement begins on a future date.",
    tone: "text-[--info-9]",
    Icon: HourglassDot,
  },
};

interface StatusFlagProps {
  status: StatusKind;
  /** Optional date suffix — rendered next to the icon as mono text. */
  effectiveDate?: string;
  /** If true, shows the label next to the icon. Default false (icon-only). */
  showLabel?: boolean;
  className?: string;
}

export function StatusFlag({
  status,
  effectiveDate,
  showLabel = false,
  className,
}: StatusFlagProps) {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  const fullLabel =
    effectiveDate && status === "effective-from"
      ? `${meta.label} ${effectiveDate}`
      : meta.label;

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 align-middle",
              meta.tone,
              className,
            )}
            role="img"
            aria-label={`${fullLabel}. ${meta.description}`}
          >
            <Icon aria-hidden />
            {showLabel && (
              <span className="text-[11px] font-medium tracking-[0.01em]">
                {fullLabel}
              </span>
            )}
            {effectiveDate && status === "effective-from" && !showLabel && (
              <span className="font-[family-name:--tp-font-mono] text-[11px]">
                {effectiveDate}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <div className="font-semibold">{fullLabel}</div>
          <div className="mt-0.5 font-normal opacity-80">
            {meta.description}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default StatusFlag;
