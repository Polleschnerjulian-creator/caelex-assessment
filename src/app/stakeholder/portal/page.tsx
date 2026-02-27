"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FolderOpen,
  FileCheck,
  Clock,
  Activity,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import DataRoomCard, {
  type DataRoom as DataRoomType,
} from "@/components/network/DataRoomCard";
import { useStakeholder } from "./layout";

interface DataRoom {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  accessLevel: string;
  expiresAt?: string;
  lastActivity?: string;
  status: string;
}

interface AttestationRequest {
  id: string;
  title: string;
  statement: string;
  status: "PENDING" | "SIGNED" | "EXPIRED" | "REJECTED";
  createdAt: string;
  dueDate?: string;
}

interface RecentActivity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  type: "view" | "download" | "comment" | "attestation" | "upload";
}

interface DashboardData {
  dataRooms: DataRoom[];
  attestations: AttestationRequest[];
  recentActivity: RecentActivity[];
}

export default function PortalDashboardPage() {
  const { profile, token } = useStakeholder();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [roomsRes, attestRes, activityRes] = await Promise.all([
        fetch("/api/stakeholder/data-rooms", { headers }),
        fetch("/api/stakeholder/attestations", { headers }),
        fetch("/api/stakeholder/activity", { headers }),
      ]);

      if (!roomsRes.ok || !attestRes.ok || !activityRes.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const [rooms, attestations, activity] = await Promise.all([
        roomsRes.json(),
        attestRes.json(),
        activityRes.json(),
      ]);

      setData({
        dataRooms: rooms.dataRooms || rooms || [],
        attestations: attestations.attestations || attestations || [],
        recentActivity: activity.activities || activity || [],
      });
    } catch {
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const pendingAttestations =
    data?.attestations.filter((a) => a.status === "PENDING") || [];
  const totalDocuments =
    data?.dataRooms.reduce((sum, r) => sum + (r.documentCount || 0), 0) || 0;

  const statCards = [
    {
      label: "Data Rooms",
      value: data?.dataRooms.length ?? 0,
      icon: FolderOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: `${totalDocuments} documents available`,
    },
    {
      label: "Pending Attestations",
      value: pendingAttestations.length,
      icon: FileCheck,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      description:
        pendingAttestations.length > 0
          ? "Requires your attention"
          : "All up to date",
    },
    {
      label: "Recent Activity",
      value: data?.recentActivity.length ?? 0,
      icon: Activity,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      description: "In the last 30 days",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-body text-slate-500 dark:text-white/50">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-title font-semibold text-slate-800 dark:text-white mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-body text-slate-500 dark:text-white/50 mb-6">
            {error}
          </p>
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-subtitle rounded-lg px-6 py-3 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-display-sm font-semibold text-slate-800 dark:text-white mb-1">
          Welcome back
          {profile?.company ? `, ${profile.company}` : ""}
        </h1>
        <p className="text-body-lg text-slate-500 dark:text-white/50">
          Access your shared data rooms, review documents, and manage
          attestations.
        </p>
      </motion.div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <GlassCard hover={false} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-small text-slate-500 dark:text-white/50 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-display-sm font-semibold text-slate-800 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-caption text-slate-400 dark:text-white/40 mt-1">
                    {stat.description}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}
                >
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Pending Attestations Alert */}
      {pendingAttestations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-8"
        >
          <GlassCard hover={false} highlighted className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-title font-medium text-slate-800 dark:text-white">
                    {pendingAttestations.length} Pending Attestation
                    {pendingAttestations.length > 1 ? "s" : ""}
                  </h3>
                  <p className="text-small text-slate-500 dark:text-white/50">
                    {pendingAttestations[0]?.title}{" "}
                    {pendingAttestations.length > 1
                      ? `and ${pendingAttestations.length - 1} more`
                      : ""}
                  </p>
                </div>
              </div>
              <a
                href={`/stakeholder/portal/attest/${pendingAttestations[0]?.id}`}
                className="flex items-center gap-1.5 text-small font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
              >
                <span>Review</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Data Rooms */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading font-semibold text-slate-800 dark:text-white">
            Assigned Data Rooms
          </h2>
          <span className="text-caption text-slate-400 dark:text-white/40">
            {data?.dataRooms.length ?? 0} room
            {(data?.dataRooms.length ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>

        {data?.dataRooms && data.dataRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.dataRooms.map((room) => (
              <a
                key={room.id}
                href={`/stakeholder/portal/data-room/${room.id}`}
              >
                <DataRoomCard
                  dataRoom={{
                    id: room.id,
                    name: room.name,
                    purpose: room.description || "",
                    stakeholderName: profile?.company || "",
                    documentCount: room.documentCount,
                    accessLevel:
                      (room.accessLevel as DataRoomType["accessLevel"]) ||
                      "VIEW_ONLY",
                    expiresAt: room.expiresAt || null,
                    status: (room.status as DataRoomType["status"]) || "ACTIVE",
                    createdAt: new Date().toISOString(),
                  }}
                  onView={() => {}}
                  onClose={() => {}}
                />
              </a>
            ))}
          </div>
        ) : (
          <GlassCard hover={false} className="p-8">
            <div className="text-center">
              <FolderOpen className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-body text-slate-500 dark:text-white/50 mb-1">
                No data rooms assigned
              </p>
              <p className="text-small text-slate-400 dark:text-white/30">
                Data rooms will appear here once your organization shares them
                with you.
              </p>
            </div>
          </GlassCard>
        )}
      </motion.div>

      {/* Recent Attestations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading font-semibold text-slate-800 dark:text-white">
            Attestation Requests
          </h2>
          <Link
            href="/stakeholder/portal/attest/new"
            className="flex items-center gap-1.5 text-small font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {data?.attestations && data.attestations.length > 0 ? (
          <div className="space-y-3">
            {data.attestations.slice(0, 5).map((attest) => (
              <a
                key={attest.id}
                href={`/stakeholder/portal/attest/${attest.id}`}
              >
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          attest.status === "PENDING"
                            ? "bg-amber-500/10"
                            : attest.status === "SIGNED"
                              ? "bg-emerald-500/10"
                              : "bg-slate-500/10"
                        }`}
                      >
                        <FileCheck
                          className={`w-4 h-4 ${
                            attest.status === "PENDING"
                              ? "text-amber-500"
                              : attest.status === "SIGNED"
                                ? "text-emerald-500"
                                : "text-slate-400"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-body font-medium text-slate-800 dark:text-white">
                          {attest.title}
                        </p>
                        <p className="text-caption text-slate-400 dark:text-white/40">
                          {new Date(attest.createdAt).toLocaleDateString()}
                          {attest.dueDate &&
                            ` — Due ${new Date(attest.dueDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-micro uppercase tracking-wider font-medium px-2.5 py-1 rounded-full ${
                        attest.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : attest.status === "SIGNED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : attest.status === "EXPIRED"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-slate-500/10 text-slate-500"
                      }`}
                    >
                      {attest.status}
                    </span>
                  </div>
                </GlassCard>
              </a>
            ))}
          </div>
        ) : (
          <GlassCard hover={false} className="p-8">
            <div className="text-center">
              <FileCheck className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-body text-slate-500 dark:text-white/50 mb-1">
                No attestation requests
              </p>
              <p className="text-small text-slate-400 dark:text-white/30">
                Attestation requests from your organization will appear here.
              </p>
            </div>
          </GlassCard>
        )}
      </motion.div>

      {/* Recent Activity */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <h2 className="text-heading font-semibold text-slate-800 dark:text-white mb-4">
            Recent Activity
          </h2>
          <GlassCard
            hover={false}
            className="divide-y divide-slate-100 dark:divide-white/5"
          >
            {data.recentActivity.slice(0, 8).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[--glass-bg-surface] flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-slate-400 dark:text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body text-slate-700 dark:text-white/80 truncate">
                    {activity.description}
                  </p>
                  <p className="text-caption text-slate-400 dark:text-white/30">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="text-micro uppercase tracking-wider text-slate-400 dark:text-white/30 flex-shrink-0">
                  {activity.type}
                </span>
              </div>
            ))}
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
