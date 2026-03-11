"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type AssetCriticality = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type OperationalStatus =
  | "ACTIVE"
  | "STANDBY"
  | "MAINTENANCE"
  | "DECOMMISSIONED"
  | "PLANNED";

export interface Asset {
  id: string;
  name: string;
  assetType: string;
  category: string;
  criticality: AssetCriticality;
  complianceScore: number;
  riskScore: number;
  operationalStatus: OperationalStatus;
}

type SortField =
  | "name"
  | "criticality"
  | "complianceScore"
  | "riskScore"
  | "updatedAt";
type SortOrder = "asc" | "desc";

interface AssetTableProps {
  assets: Asset[];
  onSort: (field: SortField, order: SortOrder) => void;
  onRowClick: (id: string) => void;
}

const CRITICALITY_BADGE: Record<AssetCriticality, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border border-red-500/30",
  HIGH: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  MEDIUM: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  LOW: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};

const STATUS_BADGE: Record<OperationalStatus, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-400",
  STANDBY: "bg-blue-500/20 text-blue-400",
  MAINTENANCE: "bg-amber-500/20 text-amber-400",
  DECOMMISSIONED: "bg-slate-500/20 text-slate-400",
  PLANNED: "bg-purple-500/20 text-purple-400",
};

const CATEGORY_ICONS: Record<string, string> = {
  SPACE_SEGMENT: "🛸",
  GROUND_SEGMENT: "📡",
  LINK_SEGMENT: "🔗",
  SOFTWARE_DATA: "💾",
  ORGANISATIONAL: "🏢",
};

function ComplianceBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-small text-slate-400 w-8 text-right">{score}%</span>
    </div>
  );
}

function SortIcon({
  field,
  currentSort,
  currentOrder,
}: {
  field: SortField;
  currentSort: SortField | null;
  currentOrder: SortOrder;
}) {
  if (currentSort !== field)
    return <ChevronsUpDown size={12} className="text-slate-600" />;
  return currentOrder === "asc" ? (
    <ChevronUp size={12} className="text-emerald-500" />
  ) : (
    <ChevronDown size={12} className="text-emerald-500" />
  );
}

export default function AssetTable({
  assets,
  onSort,
  onRowClick,
}: AssetTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  function handleSort(field: SortField) {
    const newOrder =
      sortField === field && sortOrder === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortOrder(newOrder);
    onSort(field, newOrder);
  }

  const sortableCol = (label: string, field: SortField) => (
    <th
      className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon
          field={field}
          currentSort={sortField}
          currentOrder={sortOrder}
        />
      </div>
    </th>
  );

  return (
    <div className="glass-elevated rounded-[var(--radius-lg)] overflow-hidden border border-[var(--glass-border)]">
      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-[var(--glass-border)]">
              {sortableCol("Name", "name")}
              <th className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider">
                Category
              </th>
              {sortableCol("Criticality", "criticality")}
              {sortableCol("Compliance", "complianceScore")}
              {sortableCol("Risk", "riskScore")}
              <th className="px-4 py-3 text-left text-caption text-slate-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)]">
            {assets.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-400 text-body"
                >
                  No assets found. Add your first asset to get started.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset.id}
                  onClick={() => onRowClick(asset.id)}
                  className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-body font-medium text-slate-200">
                      {asset.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-small text-slate-400">
                      {asset.assetType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-body">
                      {CATEGORY_ICONS[asset.category] ?? "•"}{" "}
                      <span className="text-small text-slate-400">
                        {asset.category.replace(/_/g, " ")}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-caption font-medium ${CRITICALITY_BADGE[asset.criticality]}`}
                    >
                      {asset.criticality}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <ComplianceBar score={asset.complianceScore} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-small font-medium ${
                        asset.riskScore >= 75
                          ? "text-red-400"
                          : asset.riskScore >= 50
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }`}
                    >
                      {asset.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-caption font-medium ${STATUS_BADGE[asset.operationalStatus]}`}
                    >
                      {asset.operationalStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
