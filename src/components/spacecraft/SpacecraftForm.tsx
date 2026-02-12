"use client";

import { useState } from "react";
import { X, Loader2, Satellite, Calendar, MapPin, Info } from "lucide-react";
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
  endOfLifeDate: string | null;
  altitudeKm: number | null;
  inclinationDeg: number | null;
  description: string | null;
}

interface SpacecraftFormProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  spacecraft?: Spacecraft | null;
  onSuccess?: () => void;
}

const MISSION_TYPES = [
  { value: "communication", label: "Communication" },
  { value: "earth_observation", label: "Earth Observation" },
  { value: "navigation", label: "Navigation" },
  { value: "scientific", label: "Scientific Research" },
  { value: "technology_demonstration", label: "Technology Demonstration" },
  { value: "weather", label: "Weather/Meteorology" },
  { value: "commercial", label: "Commercial Services" },
  { value: "debris_removal", label: "Debris Removal" },
  { value: "in_orbit_servicing", label: "In-Orbit Servicing" },
  { value: "other", label: "Other" },
];

const ORBIT_TYPES = [
  { value: "LEO", label: "Low Earth Orbit (< 2,000 km)" },
  { value: "MEO", label: "Medium Earth Orbit" },
  { value: "GEO", label: "Geostationary Orbit" },
  { value: "HEO", label: "Highly Elliptical Orbit" },
  { value: "SSO", label: "Sun-Synchronous Orbit" },
  { value: "polar", label: "Polar Orbit" },
  { value: "cislunar", label: "Cislunar" },
  { value: "deep_space", label: "Deep Space" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "PRE_LAUNCH", label: "Pre-Launch" },
  { value: "LAUNCHED", label: "Launched" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "DECOMMISSIONING", label: "Decommissioning" },
  { value: "DEORBITED", label: "Deorbited" },
  { value: "LOST", label: "Lost" },
];

export function SpacecraftForm({
  isOpen,
  onClose,
  organizationId,
  spacecraft,
  onSuccess,
}: SpacecraftFormProps) {
  const isEditing = !!spacecraft;

  const [formData, setFormData] = useState({
    name: spacecraft?.name || "",
    cosparId: spacecraft?.cosparId || "",
    noradId: spacecraft?.noradId || "",
    missionType: spacecraft?.missionType || "",
    orbitType: spacecraft?.orbitType || "",
    status: spacecraft?.status || "PRE_LAUNCH",
    launchDate: spacecraft?.launchDate?.split("T")[0] || "",
    endOfLifeDate: spacecraft?.endOfLifeDate?.split("T")[0] || "",
    altitudeKm: spacecraft?.altitudeKm?.toString() || "",
    inclinationDeg: spacecraft?.inclinationDeg?.toString() || "",
    description: spacecraft?.description || "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const url = isEditing
        ? `/api/organizations/${organizationId}/spacecraft/${spacecraft.id}`
        : `/api/organizations/${organizationId}/spacecraft`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          name: formData.name,
          cosparId: formData.cosparId || null,
          noradId: formData.noradId || null,
          missionType: formData.missionType,
          orbitType: formData.orbitType,
          status: formData.status,
          launchDate: formData.launchDate || null,
          endOfLifeDate: formData.endOfLifeDate || null,
          altitudeKm: formData.altitudeKm
            ? parseFloat(formData.altitudeKm)
            : null,
          inclinationDeg: formData.inclinationDeg
            ? parseFloat(formData.inclinationDeg)
            : null,
          description: formData.description || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save spacecraft");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save spacecraft",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setFormData({
      name: "",
      cosparId: "",
      noradId: "",
      missionType: "",
      orbitType: "",
      status: "PRE_LAUNCH",
      launchDate: "",
      endOfLifeDate: "",
      altitudeKm: "",
      inclinationDeg: "",
      description: "",
    });
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-xl shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Satellite size={20} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              {isEditing ? "Edit Spacecraft" : "Add New Spacecraft"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Info size={14} />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-white/70 mb-1.5">
                  Spacecraft Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="e.g., Caelex-1"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  COSPAR ID
                </label>
                <input
                  type="text"
                  value={formData.cosparId}
                  onChange={(e) =>
                    setFormData({ ...formData, cosparId: e.target.value })
                  }
                  placeholder="e.g., 2024-001A"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  NORAD ID
                </label>
                <input
                  type="text"
                  value={formData.noradId}
                  onChange={(e) =>
                    setFormData({ ...formData, noradId: e.target.value })
                  }
                  placeholder="e.g., 58123"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Mission Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Satellite size={14} />
              Mission Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  Mission Type *
                </label>
                <select
                  value={formData.missionType}
                  onChange={(e) =>
                    setFormData({ ...formData, missionType: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="" className="bg-slate-800">
                    Select mission type
                  </option>
                  {MISSION_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                      className="bg-slate-800"
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as SpacecraftStatus,
                    })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option
                      key={status.value}
                      value={status.value}
                      className="bg-slate-800"
                    >
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Orbital Parameters */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
              <MapPin size={14} />
              Orbital Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  Orbit Type *
                </label>
                <select
                  value={formData.orbitType}
                  onChange={(e) =>
                    setFormData({ ...formData, orbitType: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="" className="bg-slate-800">
                    Select orbit
                  </option>
                  {ORBIT_TYPES.map((orbit) => (
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

              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  Altitude (km)
                </label>
                <input
                  type="number"
                  value={formData.altitudeKm}
                  onChange={(e) =>
                    setFormData({ ...formData, altitudeKm: e.target.value })
                  }
                  placeholder="e.g., 550"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  Inclination (deg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.inclinationDeg}
                  onChange={(e) =>
                    setFormData({ ...formData, inclinationDeg: e.target.value })
                  }
                  placeholder="e.g., 53.0"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Calendar size={14} />
              Timeline
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  Launch Date
                </label>
                <input
                  type="date"
                  value={formData.launchDate}
                  onChange={(e) =>
                    setFormData({ ...formData, launchDate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1.5">
                  End of Life Date
                </label>
                <input
                  type="date"
                  value={formData.endOfLifeDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endOfLifeDate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/70 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              placeholder="Optional notes about this spacecraft..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>{isEditing ? "Save Changes" : "Add Spacecraft"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SpacecraftForm;
