"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LegalSidebar from "@/components/legal/LegalSidebar";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Shield,
  Loader2,
  ChevronRight,
} from "lucide-react";

// ---------- Types ----------

interface LegalBriefing {
  client: {
    name: string;
    country: string | null;
  };
  engagement: {
    type: string;
    createdAt: string;
    expiresAt: string;
    scopedModules: string[];
  };
  executiveSummary: string;
  compliancePosture: {
    overallScore: number;
    moduleScores: Record<
      string,
      { score: number; total: number; compliant: number }
    >;
  };
  keyGaps: Array<{
    requirementId: string;
    title: string;
    severity: string;
    module: string;
    legalImplication: string;
  }>;
  keyStrengths: Array<{
    area: string;
    detail: string;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    criticality: string;
  }>;
  documents: Array<{
    name: string;
    category: string;
    status: string;
    reviewStatus: string;
  }>;
}

interface AttorneyInfo {
  name: string;
  firmName: string;
}

// ---------- Page ----------

export default function ClientBriefingPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const engagementId = params?.engagementId as string;

  const [briefing, setBriefing] = useState<LegalBriefing | null>(null);
  const [attorney, setAttorney] = useState<AttorneyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/legal/login");
      return;
    }

    if (status !== "authenticated" || !engagementId) return;

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

        // Fetch briefing
        const res = await fetch(`/api/legal/briefing/${engagementId}`);
        if (res.status === 401) {
          router.push("/legal/login");
          return;
        }
        if (res.status === 403) {
          setError("You do not have access to this engagement.");
          return;
        }
        if (!res.ok) {
          setError("Failed to load briefing.");
          return;
        }

        const json = await res.json();
        if (json.data) {
          setBriefing(json.data);
        }
      } catch {
        setError("Failed to load briefing data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [status, engagementId, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#9ca3af]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <LegalSidebar
        attorneyName={attorney?.name ?? "Attorney"}
        firmName={attorney?.firmName ?? ""}
      />

      <main className="ml-[240px] min-h-screen">
        <div className="max-w-[1000px] mx-auto px-8 py-10">
          {/* Back link */}
          <Link
            href="/legal/dashboard"
            className="inline-flex items-center gap-2 text-[13px] text-[#9ca3af] hover:text-[#6b7280] transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>

          {error ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
              <AlertTriangle
                size={32}
                className="mx-auto text-[#d1d5db] mb-4"
              />
              <p className="text-[15px] font-medium text-[#111827]">{error}</p>
            </div>
          ) : briefing ? (
            <BriefingContent briefing={briefing} />
          ) : null}
        </div>
      </main>
    </div>
  );
}

// ---------- Briefing Content ----------

function BriefingContent({ briefing }: { briefing: LegalBriefing }) {
  const expiresDate = new Date(
    briefing.engagement.expiresAt,
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#111827]">
              {briefing.client.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-[13px] text-[#9ca3af]">
              <span>{briefing.engagement.type.replace(/_/g, " ")}</span>
              <ChevronRight size={12} />
              <span>Expires {expiresDate}</span>
              {briefing.client.country && (
                <>
                  <ChevronRight size={12} />
                  <span>{briefing.client.country}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[36px] font-bold tracking-[-0.04em] text-[#111827]">
              {Math.round(briefing.compliancePosture.overallScore)}%
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
              Overall Score
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-8">
        <SectionHeading>Executive Summary</SectionHeading>
        <p className="text-[14px] leading-relaxed text-[#374151] mt-4">
          {briefing.executiveSummary}
        </p>
      </div>

      {/* Compliance Posture */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-8">
        <SectionHeading>Compliance Posture by Module</SectionHeading>
        <div className="mt-6 space-y-4">
          {Object.entries(briefing.compliancePosture.moduleScores).map(
            ([module, data]) => (
              <ModuleScoreBar
                key={module}
                module={module}
                score={data.score}
                compliant={data.compliant}
                total={data.total}
              />
            ),
          )}
        </div>
      </div>

      {/* Key Gaps */}
      {briefing.keyGaps.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-8">
          <SectionHeading>Key Compliance Gaps</SectionHeading>
          <div className="mt-6 space-y-4">
            {briefing.keyGaps.map((gap, i) => (
              <GapItem key={`${gap.requirementId}-${i}`} gap={gap} />
            ))}
          </div>
        </div>
      )}

      {/* Key Strengths */}
      {briefing.keyStrengths.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-8">
          <SectionHeading>Key Strengths</SectionHeading>
          <div className="mt-6 space-y-3">
            {briefing.keyStrengths.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2
                  size={16}
                  className="text-[#111827] mt-0.5 shrink-0"
                />
                <div>
                  <span className="text-[13px] font-medium text-[#111827]">
                    {s.area}
                  </span>
                  <p className="text-[12px] text-[#6b7280] mt-0.5">
                    {s.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {briefing.timeline.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-8">
          <SectionHeading>Upcoming Deadlines</SectionHeading>
          <div className="mt-6 space-y-0">
            {briefing.timeline.map((item, i) => (
              <TimelineItem
                key={i}
                item={item}
                isLast={i === briefing.timeline.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {briefing.documents.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-8">
          <SectionHeading>Documents</SectionHeading>
          <div className="mt-6 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af] pb-3">
                    Name
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af] pb-3">
                    Category
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af] pb-3">
                    Status
                  </th>
                  <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af] pb-3">
                    Review
                  </th>
                </tr>
              </thead>
              <tbody>
                {briefing.documents.map((doc, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#f3f4f6] last:border-0"
                  >
                    <td className="py-3 text-[13px] text-[#111827] font-medium">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[#9ca3af]" />
                        {doc.name}
                      </div>
                    </td>
                    <td className="py-3 text-[12px] text-[#6b7280]">
                      {doc.category}
                    </td>
                    <td className="py-3">
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td className="py-3">
                      <DocumentStatusBadge status={doc.reviewStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#111827]">
      {children}
    </h2>
  );
}

function ModuleScoreBar({
  module,
  score,
  compliant,
  total,
}: {
  module: string;
  score: number;
  compliant: number;
  total: number;
}) {
  const pct = Math.round(score);
  const label = module
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-[#111827]">{label}</span>
        <span className="text-[12px] text-[#9ca3af]">
          {compliant}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#111827] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GapItem({
  gap,
}: {
  gap: {
    requirementId: string;
    title: string;
    severity: string;
    module: string;
    legalImplication: string;
  };
}) {
  const severityStyles: Record<string, string> = {
    critical: "bg-[#111827] text-white",
    major: "bg-[#374151] text-white",
    minor: "bg-[#f3f4f6] text-[#6b7280]",
  };

  return (
    <div className="border border-[#e5e7eb] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${severityStyles[gap.severity] ?? severityStyles.minor}`}
        >
          {gap.severity}
        </span>
        <span className="text-[11px] text-[#9ca3af]">
          {gap.module.replace(/_/g, " ")}
        </span>
      </div>
      <h4 className="text-[14px] font-medium text-[#111827] mb-1.5">
        {gap.title}
      </h4>
      <p className="text-[13px] leading-relaxed text-[#6b7280]">
        {gap.legalImplication}
      </p>
    </div>
  );
}

function TimelineItem({
  item,
  isLast,
}: {
  item: { date: string; event: string; criticality: string };
  isLast: boolean;
}) {
  const dateStr = new Date(item.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex gap-4">
      {/* Vertical line */}
      <div className="flex flex-col items-center">
        <div
          className={`w-2.5 h-2.5 rounded-full border-2 ${
            item.criticality === "critical"
              ? "border-[#111827] bg-[#111827]"
              : "border-[#9ca3af] bg-white"
          }`}
        />
        {!isLast && <div className="w-px flex-1 bg-[#e5e7eb]" />}
      </div>
      <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
        <div className="flex items-center gap-2 mb-0.5">
          <Clock size={12} className="text-[#9ca3af]" />
          <span className="text-[12px] font-medium text-[#9ca3af]">
            {dateStr}
          </span>
        </div>
        <p className="text-[13px] text-[#374151]">{item.event}</p>
      </div>
    </div>
  );
}

function DocumentStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/[_\s-]/g, "");

  const styles: Record<string, string> = {
    approved: "bg-[#f0fdf4] text-[#166534]",
    current: "bg-[#f0fdf4] text-[#166534]",
    reviewed: "bg-[#f0fdf4] text-[#166534]",
    pending: "bg-[#f3f4f6] text-[#6b7280]",
    pendingreview: "bg-[#f3f4f6] text-[#6b7280]",
    draft: "bg-[#f3f4f6] text-[#6b7280]",
    expired: "bg-[#fef2f2] text-[#991b1b]",
    missing: "bg-[#fef2f2] text-[#991b1b]",
    rejected: "bg-[#fef2f2] text-[#991b1b]",
  };

  const style = styles[normalized] ?? "bg-[#f3f4f6] text-[#6b7280]";

  return (
    <span
      className={`inline-block text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
