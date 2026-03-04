"use client";

import Link from "next/link";
import SatelliteCard from "./satellite-card";

interface FleetState {
  noradId: string;
  satelliteName: string;
  overallScore: number;
  dataFreshness: string;
  complianceHorizon: {
    daysUntilFirstBreach: number | null;
    firstBreachRegulation: string | null;
    confidence: string;
  };
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
  }>;
}

interface FleetOverviewProps {
  fleet: FleetState[];
  loading: boolean;
}

export default function FleetOverview({ fleet, loading }: FleetOverviewProps) {
  if (loading && fleet.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (fleet.length === 0) {
    return (
      <div className="text-center py-16 text-[#9CA3AF]">
        <p className="text-body-lg">No satellites registered</p>
        <p className="text-small mt-1">
          Add spacecraft to your organization to see compliance data.
        </p>
      </div>
    );
  }

  // Sort: lowest score first (most critical)
  const sorted = [...fleet].sort((a, b) => a.overallScore - b.overallScore);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((sat) => (
        <Link key={sat.noradId} href={`/dashboard/ephemeris/${sat.noradId}`}>
          <SatelliteCard satellite={sat} />
        </Link>
      ))}
    </div>
  );
}
