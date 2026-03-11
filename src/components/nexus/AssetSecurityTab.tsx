"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  AlertTriangle,
  Package,
  Users,
  Loader2,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export interface Vuln {
  id: string;
  cveId?: string | null;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  cvssScore?: number | null;
  status: string;
  patchAvailable: boolean;
  affectedComponent?: string | null;
  notes?: string | null;
}

export interface Supplier {
  id: string;
  supplierName: string;
  supplierType: string;
  jurisdiction?: string | null;
  riskLevel: string;
  certifications: string[];
  singlePointOfFailure: boolean;
  contractExpiry?: string | null;
}

export interface Personnel {
  id: string;
  personName: string;
  role: string;
  accessLevel: string;
  mfaEnabled: boolean;
  isActive: boolean;
  lastTraining?: string | null;
  trainingRequired: boolean;
  accessExpiresAt?: string | null;
}

interface AssetSecurityTabProps {
  assetId: string;
  vulnerabilities: Vuln[];
  suppliers: Supplier[];
  personnel: Personnel[];
}

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border border-red-500/30",
  HIGH: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  MEDIUM: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  LOW: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};

const VULN_STATUS_COLOR: Record<string, string> = {
  OPEN: "text-red-400",
  IN_PROGRESS: "text-amber-400",
  MITIGATED: "text-blue-400",
  RESOLVED: "text-emerald-400",
  ACCEPTED: "text-slate-400",
  FALSE_POSITIVE: "text-slate-500",
};

function CollapsibleSection({
  title,
  icon,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassCard hover={false} className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)] hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className="text-slate-400">{icon}</span>
        <span className="text-body font-semibold text-slate-200 flex-1">
          {title}
        </span>
        <span className="text-caption text-slate-500 mr-2">{count} items</span>
        {open ? (
          <ChevronDown size={14} className="text-slate-500" />
        ) : (
          <ChevronRight size={14} className="text-slate-500" />
        )}
      </button>
      {open && children}
    </GlassCard>
  );
}

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function AssetSecurityTab({
  assetId: _assetId,
  vulnerabilities,
  suppliers,
  personnel,
}: AssetSecurityTabProps) {
  return (
    <div className="space-y-4">
      {/* Vulnerabilities */}
      <CollapsibleSection
        title="Vulnerabilities"
        icon={<AlertTriangle size={16} />}
        count={vulnerabilities.length}
      >
        <div className="divide-y divide-[var(--glass-border)]">
          {vulnerabilities.length === 0 ? (
            <p className="px-4 py-6 text-small text-slate-500 text-center">
              No vulnerabilities recorded
            </p>
          ) : (
            vulnerabilities.map((v) => (
              <div
                key={v.id}
                className="px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-small font-medium text-slate-200">
                        {v.title}
                      </span>
                      {v.cveId && (
                        <span className="text-caption text-slate-500 font-mono">
                          {v.cveId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {v.cvssScore !== null && v.cvssScore !== undefined && (
                        <span className="text-caption text-slate-500">
                          CVSS {v.cvssScore.toFixed(1)}
                        </span>
                      )}
                      {v.affectedComponent && (
                        <span className="text-caption text-slate-500">
                          · {v.affectedComponent}
                        </span>
                      )}
                      <span
                        className={`text-caption font-medium ${VULN_STATUS_COLOR[v.status] ?? "text-slate-400"}`}
                      >
                        {v.status.replace(/_/g, " ")}
                      </span>
                      {v.patchAvailable && (
                        <span className="text-caption text-emerald-400">
                          Patch available
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-caption px-2 py-0.5 rounded border ${SEVERITY_BADGE[v.severity]}`}
                  >
                    {v.severity}
                  </span>
                </div>
                {v.notes && (
                  <p className="mt-1.5 text-caption text-slate-500">
                    {v.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-[var(--glass-border)]">
          <button className="flex items-center gap-1.5 text-small text-emerald-400 hover:text-emerald-300 transition-colors">
            <Plus size={12} /> Add Vulnerability
          </button>
        </div>
      </CollapsibleSection>

      {/* Suppliers */}
      <CollapsibleSection
        title="Suppliers & Third Parties"
        icon={<Package size={16} />}
        count={suppliers.length}
      >
        <div className="divide-y divide-[var(--glass-border)]">
          {suppliers.length === 0 ? (
            <p className="px-4 py-6 text-small text-slate-500 text-center">
              No suppliers linked
            </p>
          ) : (
            suppliers.map((s) => (
              <div
                key={s.id}
                className="px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-medium text-slate-200">
                      {s.supplierName}
                    </p>
                    <p className="text-caption text-slate-500 mt-0.5">
                      {s.supplierType.replace(/_/g, " ")}
                      {s.jurisdiction && ` · ${s.jurisdiction}`}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {s.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="text-caption px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        >
                          {cert}
                        </span>
                      ))}
                      {s.singlePointOfFailure && (
                        <span className="text-caption px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          SPOF
                        </span>
                      )}
                    </div>
                    {s.contractExpiry && (
                      <p className="text-caption text-slate-500 mt-1">
                        Contract expires: {fmt(s.contractExpiry)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 text-caption px-2 py-0.5 rounded border ${SEVERITY_BADGE[s.riskLevel] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}
                  >
                    {s.riskLevel}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-[var(--glass-border)]">
          <button className="flex items-center gap-1.5 text-small text-emerald-400 hover:text-emerald-300 transition-colors">
            <Plus size={12} /> Add Supplier
          </button>
        </div>
      </CollapsibleSection>

      {/* Personnel */}
      <CollapsibleSection
        title="Personnel & Access"
        icon={<Users size={16} />}
        count={personnel.length}
      >
        <div className="divide-y divide-[var(--glass-border)]">
          {personnel.length === 0 ? (
            <p className="px-4 py-6 text-small text-slate-500 text-center">
              No personnel records
            </p>
          ) : (
            personnel.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-small font-medium text-slate-200">
                        {p.personName}
                      </p>
                      {!p.isActive && (
                        <span className="text-caption px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-slate-500 mt-0.5">
                      {p.role.replace(/_/g, " ")} ·{" "}
                      {p.accessLevel.replace(/_/g, " ")}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className={`text-caption ${p.mfaEnabled ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {p.mfaEnabled ? "MFA enabled" : "MFA disabled"}
                      </span>
                      {p.trainingRequired && !p.lastTraining && (
                        <span className="text-caption text-amber-400">
                          Training required
                        </span>
                      )}
                      {p.lastTraining && (
                        <span className="text-caption text-slate-500">
                          Last trained: {fmt(p.lastTraining)}
                        </span>
                      )}
                    </div>
                  </div>
                  {p.accessExpiresAt && (
                    <p className="text-caption text-slate-500 flex-shrink-0">
                      Expires {fmt(p.accessExpiresAt)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-[var(--glass-border)]">
          <button className="flex items-center gap-1.5 text-small text-emerald-400 hover:text-emerald-300 transition-colors">
            <Plus size={12} /> Add Personnel
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
}
