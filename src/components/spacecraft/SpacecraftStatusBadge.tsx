"use client";

import {
  Rocket,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Archive,
} from "lucide-react";

type SpacecraftStatus =
  | "PRE_LAUNCH"
  | "LAUNCHED"
  | "OPERATIONAL"
  | "DECOMMISSIONING"
  | "DEORBITED"
  | "LOST";

interface SpacecraftStatusBadgeProps {
  status: SpacecraftStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const statusConfig: Record<
  SpacecraftStatus,
  {
    label: string;
    icon: typeof Rocket;
    bgColor: string;
    textColor: string;
    iconColor: string;
  }
> = {
  PRE_LAUNCH: {
    label: "Pre-Launch",
    icon: Clock,
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-400",
    iconColor: "text-blue-400",
  },
  LAUNCHED: {
    label: "Launched",
    icon: Rocket,
    bgColor: "bg-purple-500/20",
    textColor: "text-purple-400",
    iconColor: "text-purple-400",
  },
  OPERATIONAL: {
    label: "Operational",
    icon: CheckCircle,
    bgColor: "bg-emerald-500/20",
    textColor: "text-emerald-400",
    iconColor: "text-emerald-400",
  },
  DECOMMISSIONING: {
    label: "Decommissioning",
    icon: AlertTriangle,
    bgColor: "bg-amber-500/20",
    textColor: "text-amber-400",
    iconColor: "text-amber-400",
  },
  DEORBITED: {
    label: "Deorbited",
    icon: Archive,
    bgColor: "bg-slate-500/20",
    textColor: "text-slate-400",
    iconColor: "text-slate-400",
  },
  LOST: {
    label: "Lost",
    icon: XCircle,
    bgColor: "bg-red-500/20",
    textColor: "text-red-400",
    iconColor: "text-red-400",
  },
};

export function SpacecraftStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: SpacecraftStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon size={iconSizes[size]} className={config.iconColor} />}
      {config.label}
    </span>
  );
}

export default SpacecraftStatusBadge;
