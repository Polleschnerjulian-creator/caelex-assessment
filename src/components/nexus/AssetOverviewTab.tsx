"use client";

import GlassCard from "@/components/ui/GlassCard";

type AssetCriticality = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type OperationalStatus =
  | "ACTIVE"
  | "STANDBY"
  | "MAINTENANCE"
  | "DECOMMISSIONED"
  | "PLANNED";
type DataClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

export interface AssetDetail {
  id: string;
  name: string;
  assetType: string;
  category: string;
  criticality: AssetCriticality;
  operationalStatus: OperationalStatus;
  dataClassification: DataClassification;
  location?: string | null;
  jurisdiction?: string | null;
  complianceScore: number;
  riskScore: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  commissionedDate?: string | null;
  expectedEolDate?: string | null;
  spacecraft?: { id: string; name: string } | null;
  operatorEntity?: { id: string; name: string } | null;
}

interface AssetOverviewTabProps {
  asset: AssetDetail;
}

const CRITICALITY_COLOR: Record<AssetCriticality, string> = {
  CRITICAL: "text-red-400",
  HIGH: "text-amber-400",
  MEDIUM: "text-blue-400",
  LOW: "text-slate-400",
};

const STATUS_COLOR: Record<OperationalStatus, string> = {
  ACTIVE: "text-emerald-400",
  STANDBY: "text-blue-400",
  MAINTENANCE: "text-amber-400",
  DECOMMISSIONED: "text-slate-400",
  PLANNED: "text-purple-400",
};

function ScoreGauge({
  value,
  label,
  max = 100,
  isRisk = false,
}: {
  value: number;
  label: string;
  max?: number;
  isRisk?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = isRisk
    ? value >= 75
      ? "#EF4444"
      : value >= 50
        ? "#F59E0B"
        : "#10B981"
    : value >= 80
      ? "#10B981"
      : value >= 60
        ? "#F59E0B"
        : "#EF4444";

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle
          cx={48}
          cy={48}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={8}
        />
        <circle
          cx={48}
          cy={48}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        <text
          x={48}
          y={52}
          textAnchor="middle"
          fill="white"
          fontSize={16}
          fontWeight={600}
        >
          {value}
        </text>
      </svg>
      <span className="text-small text-slate-400">{label}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-[var(--glass-border)] last:border-0">
      <span className="text-small text-slate-400 flex-shrink-0 w-40">
        {label}
      </span>
      <span className="text-small text-slate-200 text-right">{value}</span>
    </div>
  );
}

function fmt(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function AssetOverviewTab({ asset }: AssetOverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Description */}
      {asset.description && (
        <GlassCard hover={false} className="p-4">
          <p className="text-body text-slate-300">{asset.description}</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Info grid */}
        <div className="lg:col-span-2">
          <GlassCard hover={false} className="p-5">
            <h3 className="text-title font-semibold text-white mb-3">
              Asset Details
            </h3>
            <div>
              <InfoRow
                label="Asset Type"
                value={asset.assetType.replace(/_/g, " ")}
              />
              <InfoRow
                label="Category"
                value={asset.category.replace(/_/g, " ")}
              />
              <InfoRow
                label="Criticality"
                value={
                  <span
                    className={`font-medium ${CRITICALITY_COLOR[asset.criticality]}`}
                  >
                    {asset.criticality}
                  </span>
                }
              />
              <InfoRow
                label="Operational Status"
                value={
                  <span
                    className={`font-medium ${STATUS_COLOR[asset.operationalStatus]}`}
                  >
                    {asset.operationalStatus.replace(/_/g, " ")}
                  </span>
                }
              />
              <InfoRow
                label="Data Classification"
                value={asset.dataClassification}
              />
              <InfoRow label="Location" value={asset.location ?? "—"} />
              <InfoRow label="Jurisdiction" value={asset.jurisdiction ?? "—"} />
              <InfoRow
                label="Commissioned"
                value={fmt(asset.commissionedDate)}
              />
              <InfoRow
                label="Expected EOL"
                value={fmt(asset.expectedEolDate)}
              />
              <InfoRow label="Last Updated" value={fmt(asset.updatedAt)} />
              <InfoRow label="Created" value={fmt(asset.createdAt)} />
            </div>
          </GlassCard>
        </div>

        {/* Scores */}
        <div className="space-y-4">
          <GlassCard hover={false} className="p-5">
            <h3 className="text-title font-semibold text-white mb-4">Scores</h3>
            <div className="flex justify-around">
              <ScoreGauge value={asset.complianceScore} label="Compliance" />
              <ScoreGauge value={asset.riskScore} label="Risk" isRisk />
            </div>
          </GlassCard>

          {/* Linked entities */}
          {(asset.spacecraft || asset.operatorEntity) && (
            <GlassCard hover={false} className="p-5">
              <h3 className="text-title font-semibold text-white mb-3">
                Linked Entities
              </h3>
              {asset.spacecraft && (
                <div className="mb-2">
                  <p className="text-caption text-slate-500 uppercase tracking-wider">
                    Spacecraft
                  </p>
                  <p className="text-body text-slate-200 mt-0.5">
                    {asset.spacecraft.name}
                  </p>
                </div>
              )}
              {asset.operatorEntity && (
                <div>
                  <p className="text-caption text-slate-500 uppercase tracking-wider">
                    Operator
                  </p>
                  <p className="text-body text-slate-200 mt-0.5">
                    {asset.operatorEntity.name}
                  </p>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
