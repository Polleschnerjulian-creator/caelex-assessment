"use client";

import {
  Fuel,
  Orbit,
  Cpu,
  ShieldCheck,
  Radio,
  FileText,
  Shield,
  Eye,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

const MODULE_ICONS: Record<string, typeof Fuel> = {
  fuel: Fuel,
  orbital: Orbit,
  subsystems: Cpu,
  cyber: ShieldCheck,
  ground: Radio,
  documentation: FileText,
  insurance: Shield,
  registration: Eye,
};

const MODULE_LABELS: Record<string, string> = {
  fuel: "Fuel & Passivation",
  orbital: "Orbital Lifetime",
  subsystems: "Subsystems",
  cyber: "Cybersecurity",
  ground: "Ground Segment",
  documentation: "Documentation",
  insurance: "Insurance",
  registration: "Registration",
};

function statusColor(status: string): string {
  switch (status) {
    case "COMPLIANT":
      return "text-[var(--text-primary)]";
    case "WARNING":
      return "text-[var(--accent-warning)]";
    case "NON_COMPLIANT":
      return "text-[var(--accent-danger)]";
    default:
      return "text-[var(--text-tertiary)]";
  }
}

function statusBg(status: string): string {
  switch (status) {
    case "COMPLIANT":
      return "bg-[var(--fill-light)]";
    case "WARNING":
      return "bg-[var(--accent-warning-soft)]";
    case "NON_COMPLIANT":
      return "bg-[var(--accent-danger-soft)]";
    default:
      return "bg-[var(--fill-subtle)]";
  }
}

interface ModuleBreakdownProps {
  modules: Record<
    string,
    {
      status: string;
      score: number;
      dataSource: string;
      factors: Array<{
        id: string;
        name: string;
        regulationRef: string;
        status: string;
        daysToThreshold: number | null;
        unit: string;
      }>;
    }
  >;
}

export default function ModuleBreakdown({ modules }: ModuleBreakdownProps) {
  const moduleEntries = Object.entries(modules);

  return (
    <div>
      <h2 className="text-heading font-semibold text-[var(--text-primary)] mb-4">
        Module Breakdown
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {moduleEntries.map(([key, mod]) => {
          const Icon = MODULE_ICONS[key] ?? Shield;
          return (
            <GlassCard key={key} hover={false} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${statusColor(mod.status)}`} />
                  <span className="text-small font-medium text-[var(--text-secondary)]">
                    {MODULE_LABELS[key] ?? key}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-caption font-medium ${statusColor(mod.status)} ${statusBg(mod.status)}`}
                >
                  {mod.score}
                </span>
              </div>

              {/* Score bar */}
              <div className="h-1.5 rounded-full bg-[var(--fill-medium)] mb-3">
                <div
                  className={`h-full rounded-full transition-all ${
                    mod.score >= 70
                      ? "bg-[var(--accent-primary)]"
                      : mod.score >= 50
                        ? "bg-[var(--accent-warning)]"
                        : mod.score > 0
                          ? "bg-[var(--accent-danger)]"
                          : "bg-[var(--fill-strong)]"
                  }`}
                  style={{ width: `${mod.score}%` }}
                />
              </div>

              {/* Factors */}
              <div className="space-y-1">
                {mod.factors.slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between text-caption"
                  >
                    <span className="text-[var(--text-tertiary)] truncate mr-2">
                      {f.name}
                    </span>
                    <span className={statusColor(f.status)}>
                      {f.daysToThreshold !== null
                        ? `${f.daysToThreshold}d`
                        : f.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-[var(--separator-strong)]">
                <span className="text-micro text-[var(--text-tertiary)] uppercase">
                  Source: {mod.dataSource}
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
