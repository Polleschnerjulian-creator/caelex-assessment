"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

interface AlertListProps {
  fleet: Array<{
    noradId: string;
    satelliteName: string;
    activeAlerts: Array<{
      id: string;
      type: string;
      severity: string;
      title: string;
      message: string;
    }>;
  }>;
}

function severityOrder(severity: string): number {
  switch (severity) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 3;
    default:
      return 4;
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "text-red-400";
    case "HIGH":
      return "text-orange-400";
    case "MEDIUM":
      return "text-amber-400";
    default:
      return "text-white/40";
  }
}

function severityBg(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500/10 border-red-500/20";
    case "HIGH":
      return "bg-orange-500/10 border-orange-500/20";
    case "MEDIUM":
      return "bg-amber-500/10 border-amber-500/20";
    default:
      return "bg-white/[0.03] border-white/[0.06]";
  }
}

export default function AlertList({ fleet }: AlertListProps) {
  // Flatten all alerts with satellite context
  const allAlerts = fleet
    .flatMap((s) =>
      (s.activeAlerts ?? []).map((a) => ({
        ...a,
        noradId: s.noradId,
        satelliteName: s.satelliteName,
      })),
    )
    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));

  if (allAlerts.length === 0) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-3 text-emerald-400/70">
          <CheckCircle className="w-5 h-5" />
          <span className="text-body">No active alerts</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-heading font-semibold text-white mb-3">
        Active Alerts ({allAlerts.length})
      </h3>
      {allAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-xl border ${severityBg(alert.severity)}`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${severityColor(alert.severity)}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-small font-medium ${severityColor(alert.severity)}`}
                >
                  {alert.severity}
                </span>
                <span className="text-caption text-white/30">
                  {alert.satelliteName}
                </span>
              </div>
              <p className="text-small text-white/70">{alert.title}</p>
              <p className="text-caption text-white/40 mt-0.5">
                {alert.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
