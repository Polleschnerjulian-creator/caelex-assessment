"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import DataRoomAnalytics from "@/components/assure/DataRoomAnalytics";

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

// ─── Component ───

export default function DataRoomAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/assure/dataroom/analytics");
        if (res.ok) {
          const data = await res.json();
          setAnalytics(
            data.analytics || {
              totalViews: data.totalViews ?? 0,
              uniqueViewers: data.uniqueViewers ?? 0,
              avgDuration: data.avgDuration ?? 0,
              topDocuments: data.topDocuments || [],
            },
          );
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status">
        <div className="h-8 bg-white/5 rounded-lg w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-[300px] bg-white/5 rounded-xl" />
        <span className="sr-only">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/assure/dataroom"
        className="inline-flex items-center gap-1.5 text-small text-white/40 hover:text-white/60 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Data Room
      </Link>

      {/* Header */}
      <div className="mb-10">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-display font-bold text-white mb-2"
        >
          Data Room Analytics
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body-lg text-white/40"
        >
          Track investor engagement with your data room documents.
        </motion.p>
      </div>

      {/* Analytics */}
      {analytics ? (
        <DataRoomAnalytics analytics={analytics} />
      ) : (
        <div className="text-center py-16">
          <p className="text-body text-white/30">
            No analytics data available yet. Share your data room to start
            tracking engagement.
          </p>
        </div>
      )}
    </div>
  );
}
