"use client";

import {
  Scale,
  Shield,
  ClipboardCheck,
  Package,
  Landmark,
  Lightbulb,
  Rocket,
} from "lucide-react";

export type StakeholderType =
  | "LEGAL_COUNSEL"
  | "INSURER"
  | "AUDITOR"
  | "SUPPLIER"
  | "NCA"
  | "CONSULTANT"
  | "LAUNCH_PROVIDER";

interface StakeholderTypeBadgeProps {
  type: StakeholderType;
  size?: "sm" | "md";
}

const STAKEHOLDER_CONFIG: Record<
  StakeholderType,
  {
    label: string;
    icon: typeof Scale;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  LEGAL_COUNSEL: {
    label: "Legal Counsel",
    icon: Scale,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 dark:bg-blue-500/15",
    borderColor: "border-blue-500/20",
  },
  INSURER: {
    label: "Insurer",
    icon: Shield,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 dark:bg-purple-500/15",
    borderColor: "border-purple-500/20",
  },
  AUDITOR: {
    label: "Auditor",
    icon: ClipboardCheck,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 dark:bg-amber-500/15",
    borderColor: "border-amber-500/20",
  },
  SUPPLIER: {
    label: "Supplier",
    icon: Package,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/15",
    borderColor: "border-emerald-500/20",
  },
  NCA: {
    label: "NCA",
    icon: Landmark,
    color: "text-red-400",
    bgColor: "bg-red-500/10 dark:bg-red-500/15",
    borderColor: "border-red-500/20",
  },
  CONSULTANT: {
    label: "Consultant",
    icon: Lightbulb,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 dark:bg-cyan-500/15",
    borderColor: "border-cyan-500/20",
  },
  LAUNCH_PROVIDER: {
    label: "Launch Provider",
    icon: Rocket,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 dark:bg-orange-500/15",
    borderColor: "border-orange-500/20",
  },
};

export default function StakeholderTypeBadge({
  type,
  size = "md",
}: StakeholderTypeBadgeProps) {
  const config = STAKEHOLDER_CONFIG[type];
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-micro px-1.5 py-0.5 gap-1",
    md: "text-caption px-2 py-1 gap-1.5",
  };

  const iconSize = size === "sm" ? 10 : 12;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${config.bgColor} ${config.color} ${config.borderColor} ${sizeClasses[size]}`}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {config.label}
    </span>
  );
}

export { STAKEHOLDER_CONFIG };
