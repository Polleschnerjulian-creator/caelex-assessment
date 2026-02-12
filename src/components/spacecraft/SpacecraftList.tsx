"use client";

import { useState, useEffect } from "react";
import {
  Satellite,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { SpacecraftStatusBadge } from "./SpacecraftStatusBadge";
import { csrfHeaders } from "@/lib/csrf-client";

type SpacecraftStatus =
  | "PRE_LAUNCH"
  | "LAUNCHED"
  | "OPERATIONAL"
  | "DECOMMISSIONING"
  | "DEORBITED"
  | "LOST";

interface Spacecraft {
  id: string;
  name: string;
  cosparId: string | null;
  noradId: string | null;
  missionType: string;
  orbitType: string;
  status: SpacecraftStatus;
  launchDate: string | null;
  altitudeKm: number | null;
}

interface SpacecraftListProps {
  organizationId: string;
  onCreateClick: () => void;
  onEditClick: (spacecraft: Spacecraft) => void;
  onViewClick: (spacecraft: Spacecraft) => void;
}

interface FilterOption {
  value: string;
  label: string;
}

export function SpacecraftList({
  organizationId,
  onCreateClick,
  onEditClick,
  onViewClick,
}: SpacecraftListProps) {
  const [spacecraft, setSpacecraft] = useState<Spacecraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [orbitFilter, setOrbitFilter] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [missionTypes, setMissionTypes] = useState<FilterOption[]>([]);
  const [orbitTypes, setOrbitTypes] = useState<FilterOption[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSpacecraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, statusFilter, orbitFilter]);

  async function fetchSpacecraft() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (orbitFilter) params.append("orbitType", orbitFilter);
      if (search) params.append("search", search);
      params.append("stats", "true");

      const response = await fetch(
        `/api/organizations/${organizationId}/spacecraft?${params}`,
      );

      if (response.ok) {
        const data = await response.json();
        setSpacecraft(data.spacecraft);
        setTotal(data.total);
        if (data.filterOptions) {
          setMissionTypes(data.filterOptions.missionTypes);
          setOrbitTypes(data.filterOptions.orbitTypes);
        }
      }
    } catch (error) {
      console.error("Failed to fetch spacecraft:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this spacecraft?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/spacecraft/${id}`,
        { method: "DELETE", headers: csrfHeaders() },
      );

      if (response.ok) {
        fetchSpacecraft();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete spacecraft");
      }
    } catch (error) {
      console.error("Failed to delete spacecraft:", error);
    }

    setMenuOpen(null);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchSpacecraft();
  }

  const filteredSpacecraft = spacecraft;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Spacecraft Fleet</h2>
          <p className="text-sm text-white/60">
            {total} spacecraft in your organization
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Spacecraft
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, COSPAR, or NORAD ID..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="" className="bg-slate-800">
            All Status
          </option>
          <option value="PRE_LAUNCH" className="bg-slate-800">
            Pre-Launch
          </option>
          <option value="LAUNCHED" className="bg-slate-800">
            Launched
          </option>
          <option value="OPERATIONAL" className="bg-slate-800">
            Operational
          </option>
          <option value="DECOMMISSIONING" className="bg-slate-800">
            Decommissioning
          </option>
          <option value="DEORBITED" className="bg-slate-800">
            Deorbited
          </option>
          <option value="LOST" className="bg-slate-800">
            Lost
          </option>
        </select>

        <select
          value={orbitFilter}
          onChange={(e) => setOrbitFilter(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="" className="bg-slate-800">
            All Orbits
          </option>
          {orbitTypes.map((orbit) => (
            <option
              key={orbit.value}
              value={orbit.value}
              className="bg-slate-800"
            >
              {orbit.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredSpacecraft.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <Satellite size={48} className="mx-auto mb-4 text-white/20" />
          <h3 className="text-lg font-medium text-white mb-2">
            No Spacecraft Found
          </h3>
          <p className="text-sm text-white/60 mb-4">
            {search || statusFilter || orbitFilter
              ? "Try adjusting your filters"
              : "Add your first spacecraft to get started"}
          </p>
          {!search && !statusFilter && !orbitFilter && (
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add Spacecraft
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="divide-y divide-white/5">
            {filteredSpacecraft.map((sc) => (
              <div
                key={sc.id}
                className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Satellite size={20} className="text-blue-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {sc.name}
                    </span>
                    <SpacecraftStatusBadge status={sc.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                    {sc.cosparId && <span>COSPAR: {sc.cosparId}</span>}
                    {sc.noradId && <span>NORAD: {sc.noradId}</span>}
                    <span>
                      {orbitTypes.find((o) => o.value === sc.orbitType)
                        ?.label || sc.orbitType}
                    </span>
                    {sc.altitudeKm && <span>{sc.altitudeKm} km</span>}
                  </div>
                </div>

                {/* Mission Type */}
                <div className="hidden md:block text-sm text-white/60">
                  {missionTypes.find((m) => m.value === sc.missionType)
                    ?.label || sc.missionType}
                </div>

                {/* Launch Date */}
                <div className="hidden lg:block text-sm text-white/50">
                  {sc.launchDate
                    ? new Date(sc.launchDate).toLocaleDateString()
                    : "TBD"}
                </div>

                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpen(menuOpen === sc.id ? null : sc.id)
                    }
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {menuOpen === sc.id && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          onViewClick(sc);
                          setMenuOpen(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                      >
                        <ExternalLink size={14} />
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          onEditClick(sc);
                          setMenuOpen(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(sc.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpacecraftList;
