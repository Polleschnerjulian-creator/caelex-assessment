"use client";

import { ChevronRight, Globe, Satellite, Calendar, MapPin } from "lucide-react";

interface Registration {
  id: string;
  objectName: string;
  objectType: string;
  stateOfRegistry: string;
  orbitalRegime: string;
  status: string;
  internationalDesignator: string | null;
  noradCatalogNumber: string | null;
  launchDate: string | null;
  submittedAt: string | null;
  registeredAt: string | null;
  createdAt: string;
  spacecraft: {
    id: string;
    name: string;
    cosparId: string | null;
    status: string;
  };
}

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface RegistrationCardProps {
  registration: Registration;
  statusConfig: Record<string, StatusConfig>;
  onSelect: () => void;
  onRefresh: () => void;
  organizationId: string;
}

export default function RegistrationCard({
  registration,
  statusConfig,
  onSelect,
}: RegistrationCardProps) {
  const config = statusConfig[registration.status];
  const StatusIcon = config?.icon || Globe;

  return (
    <div
      onClick={onSelect}
      className="bg-navy-800 border border-navy-700 rounded-xl p-4 hover:border-navy-600 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Satellite className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <h3 className="font-medium text-white truncate">
              {registration.objectName}
            </h3>
            <span
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs ${config?.color}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {config?.label}
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            {registration.internationalDesignator && (
              <span className="font-mono text-blue-400">
                {registration.internationalDesignator}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              {registration.stateOfRegistry}
            </span>
            <span>{registration.orbitalRegime}</span>
            <span>{formatObjectType(registration.objectType)}</span>
            {registration.launchDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(registration.launchDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Linked Spacecraft */}
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="w-3 h-3" />
            Linked to: {registration.spacecraft.name}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
      </div>
    </div>
  );
}

function formatObjectType(type: string): string {
  const types: Record<string, string> = {
    SATELLITE: "Satellite",
    SPACE_STATION: "Space Station",
    SPACE_PROBE: "Space Probe",
    CREWED_SPACECRAFT: "Crewed Spacecraft",
    LAUNCH_VEHICLE_STAGE: "Launch Vehicle Stage",
    DEBRIS: "Debris",
    OTHER: "Other",
  };
  return types[type] || type;
}
