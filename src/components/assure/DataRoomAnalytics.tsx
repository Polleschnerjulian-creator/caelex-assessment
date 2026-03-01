"use client";

import { motion } from "framer-motion";
import { Eye, Users, Clock, FileText, TrendingUp } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface TopDocument {
  name: string;
  views: number;
  avgDuration: number;
}

interface AnalyticsData {
  totalViews: number;
  uniqueViewers: number;
  avgDuration: number;
  topDocuments: TopDocument[];
}

interface DataRoomAnalyticsProps {
  analytics: AnalyticsData;
}

// ─── Helpers ───

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

// ─── Stat Card ───

function StatCard({
  icon,
  label,
  value,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  index: number;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <GlassCard hover={false} className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <p className="text-micro text-white/40 uppercase tracking-wider">
              {label}
            </p>
            <p className="text-display-sm font-bold text-white">{value}</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Component ───

export default function DataRoomAnalytics({
  analytics,
}: DataRoomAnalyticsProps) {
  const maxViews = Math.max(...analytics.topDocuments.map((d) => d.views), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Eye size={16} className="text-emerald-400" />}
          label="Total Views"
          value={analytics.totalViews.toLocaleString()}
          index={0}
        />
        <StatCard
          icon={<Users size={16} className="text-emerald-400" />}
          label="Unique Viewers"
          value={analytics.uniqueViewers.toLocaleString()}
          index={1}
        />
        <StatCard
          icon={<Clock size={16} className="text-emerald-400" />}
          label="Avg Duration"
          value={formatDuration(analytics.avgDuration)}
          index={2}
        />
      </div>

      {/* Top Documents */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-emerald-400" />
          <h3 className="text-heading font-semibold text-white">
            Most Viewed Documents
          </h3>
        </div>

        <div className="space-y-3">
          {analytics.topDocuments.map((doc, index) => {
            const widthPct = (doc.views / maxViews) * 100;

            return (
              <motion.div
                key={doc.name}
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.06 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText
                      size={14}
                      className="text-white/30 flex-shrink-0"
                    />
                    <span className="text-body text-white/70 truncate">
                      {doc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-small text-white/40">
                      {formatDuration(doc.avgDuration)} avg
                    </span>
                    <span className="text-body font-semibold text-emerald-400">
                      {doc.views} views
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{
                      duration: 0.6,
                      ease: "easeOut",
                      delay: 0.3 + index * 0.06,
                    }}
                    className="h-full rounded-full bg-emerald-500/60"
                  />
                </div>
              </motion.div>
            );
          })}

          {analytics.topDocuments.length === 0 && (
            <div className="text-center py-4">
              <p className="text-body text-white/30">No document views yet.</p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
