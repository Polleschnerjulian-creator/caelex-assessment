/**
 * Caelex Trade — shared ScreeningBadge.
 *
 * Icon badge for a TradeParty's sanctions-screening status, with a
 * humanized tooltip + screen-reader label (`role="img"` + `aria-label`).
 * Extracted verbatim from /trade/parties so the parties list and the
 * /trade/screening triage surface render the exact same badge.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { type ReactNode } from "react";
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { tradeStatusLabel } from "@/lib/trade/format";

export type ScreeningStatus =
  | "NOT_SCREENED"
  | "CLEAR"
  | "POTENTIAL_MATCH"
  | "CONFIRMED_HIT"
  | "STALE";

export function ScreeningBadge({ status }: { status: ScreeningStatus }) {
  const className = "h-5 w-5 shrink-0";
  // Humanized label powers tooltips AND screen-reader announcements.
  // Without it, icon-only badges are invisible to assistive tech.
  // Wrapping in <span title=...> guarantees a visible browser tooltip
  // across all browsers — title on raw <svg> isn't universally honored.
  const label = `Screening status: ${tradeStatusLabel(status)}`;
  const a11yProps = {
    role: "img" as const,
    "aria-label": label,
  };
  const wrap = (icon: ReactNode) => (
    <span title={label} className="inline-flex">
      {icon}
    </span>
  );
  if (status === "CLEAR") {
    return wrap(
      <ShieldCheck
        {...a11yProps}
        className={`${className} text-emerald-600`}
        strokeWidth={1.75}
      />,
    );
  }
  if (status === "POTENTIAL_MATCH") {
    return wrap(
      <AlertTriangle
        {...a11yProps}
        className={`${className} text-amber-500`}
        strokeWidth={1.75}
      />,
    );
  }
  if (status === "CONFIRMED_HIT") {
    return wrap(
      <ShieldAlert
        {...a11yProps}
        className={`${className} text-red-600`}
        strokeWidth={1.75}
      />,
    );
  }
  if (status === "STALE") {
    return wrap(
      <Shield
        {...a11yProps}
        className={`${className} text-orange-500`}
        strokeWidth={1.75}
      />,
    );
  }
  return wrap(
    <Shield
      {...a11yProps}
      className={`${className} text-trade-text-muted`}
      strokeWidth={1.5}
    />,
  );
}
