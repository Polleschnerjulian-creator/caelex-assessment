/**
 * Caelex Trade — shared licence list types + metadata (UI Phase 3B).
 *
 * Extracted from licenses/page.tsx so the list page AND the renewal
 * modal (LicenseRenewalModal) share one definition of LicenseRow /
 * TYPE_META / STATUS_META / STATUS_OPTIONS instead of duplicating them.
 * Pure data + types — no React, no client hooks (icons are values, not
 * JSX), so this file is import-safe from both server and client modules.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";

// ─── Status / type unions ─────────────────────────────────────────────

export type LicenseStatus =
  | "DRAFT"
  | "PENDING"
  | "ACTIVE"
  | "REVOKED"
  | "EXPIRED"
  | "EXHAUSTED";

export type LicenseType =
  | "BAFA_EINZEL"
  | "BAFA_AGG_12"
  | "BAFA_AGG_16"
  | "BAFA_AGG_27"
  | "BAFA_AGG_47"
  | "BAFA_EUGEA_EU001"
  | "BAFA_EUGEA_EU002"
  | "BIS_EAR"
  | "BIS_LICENSE_EXCEPTION_STA"
  | "BIS_LICENSE_EXCEPTION_CSA"
  | "BIS_LICENSE_EXCEPTION_ENC"
  | "DDTC_DSP5"
  | "DDTC_DSP73"
  | "DDTC_TAA"
  | "DDTC_MLA"
  | "OTHER";

export interface LicenseRow {
  id: string;
  licenseType: LicenseType;
  licenseNumber: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  conditions: Record<string, unknown>;
  drawnDownValue: number;
  totalCapValue: number | null;
  capCurrency: string;
  status: LicenseStatus;
  documentId: string | null;
  createdAt: string;
  _count: { operations: number };
}

// ─── License-type metadata ────────────────────────────────────────────

export const TYPE_META: Record<
  LicenseType,
  {
    label: string;
    jurisdiction: string;
    group: "BAFA" | "BIS" | "DDTC" | "EU" | "OTHER";
  }
> = {
  BAFA_EINZEL: {
    label: "BAFA Einzelausfuhr",
    jurisdiction: "DE",
    group: "BAFA",
  },
  BAFA_AGG_12: { label: "BAFA AGG 12", jurisdiction: "DE", group: "BAFA" },
  BAFA_AGG_16: { label: "BAFA AGG 16", jurisdiction: "DE", group: "BAFA" },
  BAFA_AGG_27: { label: "BAFA AGG 27", jurisdiction: "DE", group: "BAFA" },
  BAFA_AGG_47: { label: "BAFA AGG 47", jurisdiction: "DE", group: "BAFA" },
  BAFA_EUGEA_EU001: {
    label: "EUGEA EU001",
    jurisdiction: "EU",
    group: "EU",
  },
  BAFA_EUGEA_EU002: {
    label: "EUGEA EU002",
    jurisdiction: "EU",
    group: "EU",
  },
  BIS_EAR: { label: "BIS EAR License", jurisdiction: "US", group: "BIS" },
  BIS_LICENSE_EXCEPTION_STA: {
    label: "BIS License Exception STA",
    jurisdiction: "US",
    group: "BIS",
  },
  BIS_LICENSE_EXCEPTION_CSA: {
    label: "BIS License Exception CSA",
    jurisdiction: "US",
    group: "BIS",
  },
  BIS_LICENSE_EXCEPTION_ENC: {
    label: "BIS License Exception ENC",
    jurisdiction: "US",
    group: "BIS",
  },
  DDTC_DSP5: { label: "DDTC DSP-5", jurisdiction: "US", group: "DDTC" },
  DDTC_DSP73: {
    label: "DDTC DSP-73 (temporary)",
    jurisdiction: "US",
    group: "DDTC",
  },
  DDTC_TAA: { label: "DDTC TAA", jurisdiction: "US", group: "DDTC" },
  DDTC_MLA: { label: "DDTC MLA", jurisdiction: "US", group: "DDTC" },
  OTHER: { label: "Other", jurisdiction: "—", group: "OTHER" },
};

// ─── Status meta ──────────────────────────────────────────────────────

export const STATUS_META: Record<
  LicenseStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  DRAFT: {
    label: "Draft",
    icon: Clock,
    className: "bg-trade-bg-subtle text-trade-text-secondary",
  },
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-50 text-amber-700",
  },
  ACTIVE: {
    label: "Active",
    icon: ShieldCheck,
    className: "bg-emerald-50 text-emerald-700",
  },
  REVOKED: {
    label: "Revoked",
    icon: XCircle,
    className: "bg-red-50 text-red-700",
  },
  EXPIRED: {
    label: "Expired",
    icon: XCircle,
    className: "bg-red-50 text-red-700",
  },
  EXHAUSTED: {
    label: "Exhausted",
    icon: ShieldAlert,
    className: "bg-orange-50 text-orange-700",
  },
};

export const STATUS_OPTIONS: ReadonlyArray<{
  key: LicenseStatus;
  label: string;
}> = [
  { key: "ACTIVE", label: "Active" },
  { key: "PENDING", label: "Pending" },
  { key: "DRAFT", label: "Draft" },
  { key: "EXPIRED", label: "Expired" },
  { key: "EXHAUSTED", label: "Exhausted" },
];
