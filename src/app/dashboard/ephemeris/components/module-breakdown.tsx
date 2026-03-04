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
      return "text-[#111827]";
    case "WARNING":
      return "text-amber-500";
    case "NON_COMPLIANT":
      return "text-red-500";
    default:
      return "text-[#D1D5DB]";
  }
}

function statusBg(status: string): string {
  switch (status) {
    case "COMPLIANT":
      return "bg-[#F1F3F5]";
    case "WARNING":
      return "bg-amber-50";
    case "NON_COMPLIANT":
      return "bg-red-50";
    default:
      return "bg-[#F7F8FA]";
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
      <h2 className="text-heading font-semibold text-[#111827] mb-4">
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
                  <span className="text-small font-medium text-[#374151]">
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
              <div className="h-1.5 rounded-full bg-[#E5E7EB] mb-3">
                <div
                  className={`h-full rounded-full transition-all ${
                    mod.score >= 70
                      ? "bg-[#111827]"
                      : mod.score >= 50
                        ? "bg-amber-500"
                        : mod.score > 0
                          ? "bg-red-500"
                          : "bg-[#D1D5DB]"
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
                    <span className="text-[#9CA3AF] truncate mr-2">
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

              <div className="mt-2 pt-2 border-t border-[#E5E7EB]">
                <span className="text-micro text-[#D1D5DB] uppercase">
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
