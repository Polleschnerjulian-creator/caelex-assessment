"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Satellite,
  Globe,
  Building2,
  Orbit,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";

interface OperatorProfileData {
  id: string;
  operatorType: string | null;
  entitySize: string | null;
  primaryOrbit: string | null;
  establishment: string | null;
  completeness: number;
}

const OPERATOR_TYPE_LABELS: Record<string, string> = {
  spacecraft_operator: "Spacecraft Operator",
  launch_operator: "Launch Operator",
  launch_site_operator: "Launch Site Operator",
  in_space_services_provider: "In-Space Services",
  primary_data_provider: "Primary Data Provider",
  third_country_operator: "Third Country Operator",
  capsule_operator: "Capsule Operator",
  return_operator: "Return Operator",
  spaceport_operator: "Spaceport Operator",
  satellite_operator: "Satellite Operator",
  reentry_operator: "Reentry Operator",
};

const ENTITY_SIZE_LABELS: Record<string, string> = {
  micro: "Micro",
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const ORBIT_LABELS: Record<string, string> = {
  LEO: "LEO",
  MEO: "MEO",
  GEO: "GEO",
  GTO: "GTO",
  HEO: "HEO",
  SSO: "SSO",
  cislunar: "Cislunar",
  deep_space: "Deep Space",
  NGSO: "NGSO",
};

export default function OperatorProfileCard() {
  const [profile, setProfile] = useState<OperatorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/organization/profile");
        if (res.ok) {
          const json = await res.json();
          setProfile(json.profile);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-slate-400 dark:text-white/30 animate-spin" />
        </div>
      </GlassCard>
    );
  }

  if (error || !profile) {
    return null;
  }

  const completenessPercent = Math.round(profile.completeness * 100);
  const isComplete = profile.completeness >= 1;

  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
      <GlassCard hover={false} className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-emerald-400" />
            <h3 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
              Operator Profile
            </h3>
          </div>
          {isComplete ? (
            <Badge variant="success" size="sm">
              Complete
            </Badge>
          ) : (
            <Badge variant="warning" size="sm">
              {completenessPercent}%
            </Badge>
          )}
        </div>

        {/* Completeness Progress */}
        <Progress
          value={completenessPercent}
          max={100}
          size="sm"
          color="emerald"
          className="mb-5"
        />

        {/* Profile Fields */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Operator Type */}
          <div className="flex items-start gap-2.5">
            <Satellite className="w-3.5 h-3.5 text-slate-400 dark:text-white/30 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30">
                Operator Type
              </p>
              <p className="text-body text-slate-700 dark:text-slate-200 truncate">
                {profile.operatorType
                  ? OPERATOR_TYPE_LABELS[profile.operatorType] ||
                    profile.operatorType
                  : "--"}
              </p>
            </div>
          </div>

          {/* Primary Orbit */}
          <div className="flex items-start gap-2.5">
            <Orbit className="w-3.5 h-3.5 text-slate-400 dark:text-white/30 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30">
                Primary Orbit
              </p>
              <p className="text-body text-slate-700 dark:text-slate-200 truncate">
                {profile.primaryOrbit
                  ? ORBIT_LABELS[profile.primaryOrbit] || profile.primaryOrbit
                  : "--"}
              </p>
            </div>
          </div>

          {/* Entity Size */}
          <div className="flex items-start gap-2.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-white/30 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30">
                Entity Size
              </p>
              <p className="text-body text-slate-700 dark:text-slate-200 truncate">
                {profile.entitySize
                  ? ENTITY_SIZE_LABELS[profile.entitySize] || profile.entitySize
                  : "--"}
              </p>
            </div>
          </div>

          {/* Establishment */}
          <div className="flex items-start gap-2.5">
            <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-white/30 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30">
                Establishment
              </p>
              <p className="text-body text-slate-700 dark:text-slate-200 truncate">
                {profile.establishment
                  ? profile.establishment.toUpperCase()
                  : "--"}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        {!isComplete && (
          <Link
            href="/dashboard/settings?tab=profile"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-body font-medium transition-colors"
          >
            Complete Your Profile
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </GlassCard>
    </motion.div>
  );
}
