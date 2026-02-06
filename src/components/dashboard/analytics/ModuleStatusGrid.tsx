"use client";

import React from "react";
import Link from "next/link";
import {
  FileCheck,
  Orbit,
  Shield,
  Umbrella,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { ModuleStatus } from "@/lib/services";

interface ModuleStatusGridProps {
  modules: ModuleStatus[];
}

const MODULE_CONFIG: Record<
  string,
  {
    icon: LucideIcon;
    label: string;
    href: string;
    color: string;
  }
> = {
  authorization: {
    icon: FileCheck,
    label: "Authorization",
    href: "/dashboard/authorization",
    color: "blue",
  },
  debris: {
    icon: Orbit,
    label: "Debris Mitigation",
    href: "/dashboard/modules/debris",
    color: "purple",
  },
  cybersecurity: {
    icon: Shield,
    label: "Cybersecurity",
    href: "/dashboard/modules/cybersecurity",
    color: "cyan",
  },
  insurance: {
    icon: Umbrella,
    label: "Insurance",
    href: "/dashboard/modules/insurance",
    color: "amber",
  },
  environmental: {
    icon: Leaf,
    label: "Environmental",
    href: "/dashboard/modules/environmental",
    color: "green",
  },
  incidents: {
    icon: AlertTriangle,
    label: "Incident Response",
    href: "/dashboard/supervision",
    color: "red",
  },
};

export function ModuleStatusGrid({ modules }: ModuleStatusGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} />
      ))}
    </div>
  );
}

function ModuleCard({ module }: { module: ModuleStatus }) {
  const config = MODULE_CONFIG[module.id] || {
    icon: FileCheck,
    label: module.name,
    href: "/dashboard",
    color: "slate",
  };

  const Icon = config.icon;

  const getStatusIcon = (status: ModuleStatus["status"]) => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case "partial":
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case "non_compliant":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "pending":
        return <Clock className="w-5 h-5 text-blue-400" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusLabel = (status: ModuleStatus["status"]) => {
    switch (status) {
      case "compliant":
        return "Compliant";
      case "partial":
        return "Partial";
      case "non_compliant":
        return "Non-Compliant";
      case "pending":
        return "Pending";
      case "not_started":
        return "Not Started";
      default:
        return status;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score > 0) return "text-red-400";
    return "text-slate-400";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score > 0) return "bg-red-500";
    return "bg-slate-500";
  };

  return (
    <Link href={config.href}>
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 hover:border-navy-600 transition-colors group">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-2 rounded-lg bg-${config.color}-500/10 text-${config.color}-400`}
          >
            <Icon className="w-5 h-5" />
          </div>
          {getStatusIcon(module.status)}
        </div>

        <h3 className="font-semibold text-white mb-1">{config.label}</h3>
        <p className="text-sm text-slate-400 mb-4">
          {getStatusLabel(module.status)}
        </p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Score</span>
            <span
              className={`text-sm font-semibold ${getScoreColor(module.score)}`}
            >
              {module.score}%
            </span>
          </div>
          <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(module.score)} transition-all duration-500`}
              style={{ width: `${module.score}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {module.itemsComplete}/{module.itemsTotal} items
          </span>
          {module.criticalIssues > 0 && (
            <span className="text-red-400 font-medium">
              {module.criticalIssues} critical
            </span>
          )}
        </div>

        {/* Next deadline */}
        {module.nextDeadline && (
          <div className="mt-3 pt-3 border-t border-navy-700">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400">
                Due{" "}
                {module.nextDeadline.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        )}

        {/* Hover arrow */}
        <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </Link>
  );
}
