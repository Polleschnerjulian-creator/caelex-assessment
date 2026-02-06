"use client";

import { Crown, Sparkles, Zap, User } from "lucide-react";

type Plan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

interface PlanBadgeProps {
  plan: Plan;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const planConfig: Record<
  Plan,
  { label: string; icon: typeof Crown; color: string; bgColor: string }
> = {
  FREE: {
    label: "Free",
    icon: User,
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
  },
  STARTER: {
    label: "Starter",
    icon: Zap,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  PROFESSIONAL: {
    label: "Professional",
    icon: Sparkles,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  ENTERPRISE: {
    label: "Enterprise",
    icon: Crown,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
};

export function PlanBadge({
  plan,
  size = "md",
  showIcon = true,
}: PlanBadgeProps) {
  const config = planConfig[plan] || planConfig.FREE;
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
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

export default PlanBadge;
