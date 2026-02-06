"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ChevronRight, Bell } from "lucide-react";
import type { DashboardAlert } from "@/lib/services";

interface AlertBannerProps {
  alerts: DashboardAlert[];
  onDismiss?: (alertId: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  // Only show critical and high alerts
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "critical" || a.severity === "high",
  );

  if (criticalAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {criticalAlerts.slice(0, 3).map((alert) => (
          <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>

      {criticalAlerts.length > 3 && (
        <Link
          href="/dashboard/alerts"
          className="flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <Bell className="w-4 h-4" />
          View {criticalAlerts.length - 3} more alerts
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

function AlertItem({
  alert,
  onDismiss,
}: {
  alert: DashboardAlert;
  onDismiss?: (alertId: string) => void;
}) {
  const isCritical = alert.severity === "critical";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={`rounded-lg border p-4 ${
        isCritical
          ? "bg-red-500/10 border-red-500/30"
          : "bg-orange-500/10 border-orange-500/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 p-1 rounded ${
            isCritical ? "bg-red-500/20" : "bg-orange-500/20"
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 ${isCritical ? "text-red-400" : "text-orange-400"}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4
                className={`font-medium ${
                  isCritical ? "text-red-400" : "text-orange-400"
                }`}
              >
                {alert.title}
              </h4>
              <p className="text-sm text-slate-400 mt-0.5">
                {alert.description}
              </p>
            </div>

            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                className="flex-shrink-0 p-1 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {alert.link && (
            <Link
              href={alert.link}
              className={`inline-flex items-center gap-1 mt-2 text-sm font-medium ${
                isCritical
                  ? "text-red-400 hover:text-red-300"
                  : "text-orange-400 hover:text-orange-300"
              }`}
            >
              Take action
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Compact version for sidebar
export function CompactAlertBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
      {count > 99 ? "99+" : count}
    </span>
  );
}
