"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LegalSidebar from "@/components/legal/LegalSidebar";
import {
  Briefcase,
  Clock,
  FileText,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";

interface Engagement {
  id: string;
  organizationId: string;
  organizationName: string;
  engagementType: string;
  title: string;
  description: string | null;
  status: string;
  scopedModules: string[];
  expiresAt: string;
  createdAt: string;
  allowExport: boolean;
  accepted: boolean;
}

interface AttorneyInfo {
  name: string;
  firmName: string;
}

export default function LegalDashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [attorney, setAttorney] = useState<AttorneyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/legal/login");
      return;
    }

    if (status !== "authenticated") return;

    async function load() {
      try {
        // Fetch attorney context
        const ctxRes = await fetch("/api/legal/context");
        if (ctxRes.status === 401) {
          router.push("/legal/login");
          return;
        }

        const ctxData = await ctxRes.json();
        if (ctxData.data) {
          setAttorney({
            name: ctxData.data.name,
            firmName: ctxData.data.firmName,
          });
        }

        // Fetch engagements
        const res = await fetch("/api/legal/engagements");
        if (res.status === 401) {
          router.push("/legal/login");
          return;
        }

        const json = await res.json();
        if (json.data) {
          setEngagements(json.data);
        }
      } catch {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#9ca3af]" />
      </div>
    );
  }

  const activeEngagements = engagements.filter(
    (e) => e.status === "active" && e.accepted,
  );
  const pendingInvitations = engagements.filter((e) => !e.accepted);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <LegalSidebar
        attorneyName={attorney?.name ?? "Attorney"}
        firmName={attorney?.firmName ?? ""}
      />

      {/* Main content */}
      <main className="ml-[240px] min-h-screen">
        <div className="max-w-[1100px] mx-auto px-8 py-10">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#111827]">
              Welcome, {attorney?.name ?? "Attorney"}
            </h1>
            {attorney?.firmName && (
              <p className="mt-1 text-[14px] text-[#9ca3af]">
                {attorney.firmName}
              </p>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-5 mb-10">
            <StatsCard
              icon={Briefcase}
              label="Active Engagements"
              value={activeEngagements.length}
            />
            <StatsCard
              icon={Clock}
              label="Pending Invitations"
              value={pendingInvitations.length}
            />
            <StatsCard icon={FileText} label="Documents to Review" value={0} />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[13px] text-[#991b1b]">
              {error}
            </div>
          )}

          {/* Engagements Grid */}
          <div className="mb-6">
            <h2 className="text-[16px] font-semibold text-[#111827] mb-4">
              Client Engagements
            </h2>
          </div>

          {engagements.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
              <Shield size={32} className="mx-auto text-[#d1d5db] mb-4" />
              <p className="text-[15px] font-medium text-[#111827]">
                No engagements yet
              </p>
              <p className="mt-1 text-[13px] text-[#9ca3af]">
                You will see client engagements here once an organization grants
                your firm access.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {engagements.map((engagement) => (
                <EngagementCard key={engagement.id} engagement={engagement} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------- Sub-components ----------

function StatsCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#f3f4f6] flex items-center justify-center">
          <Icon size={16} className="text-[#6b7280]" />
        </div>
        <span className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#9ca3af]">
          {label}
        </span>
      </div>
      <p className="text-[28px] font-semibold tracking-[-0.03em] text-[#111827]">
        {value}
      </p>
    </div>
  );
}

function EngagementCard({ engagement }: { engagement: Engagement }) {
  const isActive = engagement.status === "active" && engagement.accepted;
  const isPending = !engagement.accepted;
  const isExpired = new Date(engagement.expiresAt) < new Date();

  const statusLabel = isPending
    ? "Pending"
    : isExpired
      ? "Expired"
      : engagement.status === "revoked"
        ? "Revoked"
        : engagement.status === "active"
          ? "Active"
          : engagement.status;

  const statusColor = isPending
    ? "bg-[#f3f4f6] text-[#6b7280]"
    : isExpired || engagement.status === "revoked"
      ? "bg-[#fef2f2] text-[#991b1b]"
      : "bg-[#f0fdf4] text-[#166534]";

  const expiresDate = new Date(engagement.expiresAt).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-6 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-[15px] font-semibold text-[#111827] truncate">
            {engagement.organizationName}
          </h3>
          <span
            className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>

        <p className="text-[13px] text-[#6b7280] mb-1">
          {engagement.engagementType.replace(/_/g, " ")}
          {engagement.title ? ` — ${engagement.title}` : ""}
        </p>

        <div className="flex items-center gap-4 text-[12px] text-[#9ca3af]">
          <span>Expires {expiresDate}</span>
          <span>{engagement.scopedModules.length} module(s) in scope</span>
        </div>
      </div>

      {isActive && !isExpired && (
        <Link
          href={`/legal/clients/${engagement.id}`}
          className="shrink-0 ml-6 flex items-center gap-2 px-4 py-2.5 bg-[#111827] text-white text-[13px] font-medium rounded-lg hover:bg-black transition-colors"
        >
          View Briefing
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
