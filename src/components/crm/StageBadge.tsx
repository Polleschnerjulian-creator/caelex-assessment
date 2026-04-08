import type { CrmDealStage, CrmLifecycleStage } from "@prisma/client";
import { DEAL_STAGE_LABELS, LIFECYCLE_STAGE_LABELS } from "@/lib/crm/types";

const DEAL_STAGE_COLORS: Record<CrmDealStage, { bg: string; text: string }> = {
  IDENTIFIED: { bg: "var(--surface-sunken)", text: "var(--text-secondary)" },
  ENGAGED: {
    bg: "var(--accent-info-soft)",
    text: "var(--accent-info)",
  },
  ASSESSED: {
    bg: "var(--accent-primary-soft)",
    text: "var(--accent-primary)",
  },
  PROPOSAL: {
    bg: "var(--accent-primary-soft)",
    text: "var(--accent-primary)",
  },
  PROCUREMENT: {
    bg: "var(--accent-warning-soft)",
    text: "var(--accent-warning)",
  },
  CLOSED_WON: {
    bg: "var(--accent-success-soft)",
    text: "var(--accent-success)",
  },
  CLOSED_LOST: {
    bg: "var(--accent-danger)/15",
    text: "var(--accent-danger)",
  },
  ONBOARDING: {
    bg: "var(--accent-info-soft)",
    text: "var(--accent-info)",
  },
  ACTIVE: {
    bg: "var(--accent-success-soft)",
    text: "var(--accent-success)",
  },
};

const LIFECYCLE_COLORS: Record<
  CrmLifecycleStage,
  { bg: string; text: string }
> = {
  SUBSCRIBER: { bg: "var(--surface-sunken)", text: "var(--text-tertiary)" },
  LEAD: { bg: "var(--surface-sunken)", text: "var(--text-secondary)" },
  MQL: { bg: "var(--accent-info-soft)", text: "var(--accent-info)" },
  SQL: { bg: "var(--accent-primary-soft)", text: "var(--accent-primary)" },
  OPPORTUNITY: {
    bg: "var(--accent-warning-soft)",
    text: "var(--accent-warning)",
  },
  CUSTOMER: {
    bg: "var(--accent-success-soft)",
    text: "var(--accent-success)",
  },
  EVANGELIST: {
    bg: "var(--accent-success-soft)",
    text: "var(--accent-success)",
  },
  CHURNED: { bg: "var(--accent-danger)/15", text: "var(--accent-danger)" },
  DISQUALIFIED: {
    bg: "var(--surface-sunken)",
    text: "var(--text-tertiary)",
  },
};

export function DealStageBadge({
  stage,
  size = "md",
}: {
  stage: CrmDealStage;
  size?: "sm" | "md";
}) {
  const colors = DEAL_STAGE_COLORS[stage];
  const sizeClass =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-small";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{ background: colors.bg, color: colors.text }}
    >
      {DEAL_STAGE_LABELS[stage]}
    </span>
  );
}

export function LifecycleBadge({
  stage,
  size = "md",
}: {
  stage: CrmLifecycleStage;
  size?: "sm" | "md";
}) {
  const colors = LIFECYCLE_COLORS[stage];
  const sizeClass =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-small";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{ background: colors.bg, color: colors.text }}
    >
      {LIFECYCLE_STAGE_LABELS[stage]}
    </span>
  );
}
