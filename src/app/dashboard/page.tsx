"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  PlayCircle,
  CheckCircle,
  X,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { articles } from "@/data/articles";
import { modules } from "@/data/modules";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

interface ArticleStatusData {
  status: string;
  notes: string | null;
  updatedAt: Date;
}

const moduleRoutes: Record<string, string> = {
  authorization: "/dashboard/modules/authorization",
  registration: "/dashboard/modules/registration",
  environmental: "/dashboard/modules/environmental",
  cybersecurity: "/dashboard/modules/cybersecurity",
  debris: "/dashboard/modules/debris",
  insurance: "/dashboard/modules/insurance",
  supervision: "/dashboard/modules/supervision",
  regulatory: "/dashboard/modules/supervision",
};

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [articleStatuses, setArticleStatuses] = useState<
    Record<string, ArticleStatusData>
  >({});
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (searchParams.get("imported") === "true") {
      setShowSuccessToast(true);
      window.history.replaceState({}, "", "/dashboard");
      const timer = setTimeout(() => setShowSuccessToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const daysUntilEnforcement = Math.ceil(
    (new Date("2030-01-01").getTime() - Date.now()) / 86400000,
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/tracker/articles");
        if (res.ok) {
          const data = await res.json();
          setArticleStatuses(data);
          setHasData(Object.keys(data).length > 0);
        }
      } catch (error) {
        console.error("Error fetching article statuses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [documentCount, setDocumentCount] = useState<number>(0);
  const [pendingAssessment, setPendingAssessment] = useState<{
    operatorType: string;
    regime: string;
    entitySize: string;
    constellationTier: string | null;
    orbit: string;
    isEU: boolean;
    isThirdCountry: boolean;
    applicableArticles: (string | number)[];
    moduleStatuses: {
      id: string;
      name: string;
      status: string;
      articleCount: number;
    }[];
    completedAt: string;
  } | null>(null);

  // Fetch document count
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch("/api/documents/dashboard");
        if (res.ok) {
          const data = await res.json();
          setDocumentCount(data.stats?.total ?? 0);
        }
      } catch (error) {
        console.error("Error fetching document count:", error);
      }
    };
    fetchDocuments();
  }, []);

  // Check for pending assessment in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("caelex-pending-assessment");
      if (stored) {
        setPendingAssessment(JSON.parse(stored));
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const stats = { total: 0, compliant: 0, applicable: 0, documents: 0 };

  for (const article of articles) {
    const status = articleStatuses[article.id]?.status;
    if (status && status !== "not_applicable") {
      stats.applicable++;
      if (status === "compliant") stats.compliant++;
    }
    stats.total++;
  }

  const progressPercent =
    stats.applicable > 0
      ? Math.round((stats.compliant / stats.applicable) * 100)
      : 0;

  const moduleProgress: Record<
    string,
    { total: number; compliant: number; status: string }
  > = {};
  for (const mod of modules) {
    moduleProgress[mod.id] = { total: 0, compliant: 0, status: "Not Started" };
  }

  for (const article of articles) {
    const status = articleStatuses[article.id]?.status;
    if (
      status &&
      status !== "not_applicable" &&
      moduleProgress[article.module]
    ) {
      moduleProgress[article.module].total++;
      if (status === "compliant") moduleProgress[article.module].compliant++;
    }
  }

  for (const mod of modules) {
    const prog = moduleProgress[mod.id];
    if (prog.total === 0) {
      prog.status = "Not Started";
    } else if (prog.compliant === prog.total) {
      prog.status = "Complete";
    } else if (prog.compliant > 0) {
      prog.status = `${Math.round((prog.compliant / prog.total) * 100)}% Complete`;
    } else {
      prog.status = "Not Started";
    }
  }

  const handleImport = async () => {
    if (!selectedOperator) return;
    setImporting(true);
    try {
      const res = await fetch("/api/tracker/import-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorType: selectedOperator }),
      });
      if (res.ok) {
        const articlesRes = await fetch("/api/tracker/articles");
        if (articlesRes.ok) {
          const data = await articlesRes.json();
          setArticleStatuses(data);
          setHasData(true);
        }
        setShowImportModal(false);
      }
    } catch (error) {
      console.error("Error importing assessment:", error);
    } finally {
      setImporting(false);
    }
  };

  const handleDismissPendingAssessment = () => {
    try {
      localStorage.removeItem("caelex-pending-assessment");
    } catch {
      // localStorage may be unavailable
    }
    setPendingAssessment(null);
  };

  const handleImportFromLocalStorage = async () => {
    if (!pendingAssessment) return;
    setImporting(true);
    try {
      const res = await fetch("/api/tracker/import-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorType: pendingAssessment.operatorType }),
      });
      if (res.ok) {
        // Remove from localStorage
        try {
          localStorage.removeItem("caelex-pending-assessment");
        } catch {
          // localStorage may be unavailable
        }
        setPendingAssessment(null);

        // Refetch article statuses
        const articlesRes = await fetch("/api/tracker/articles");
        if (articlesRes.ok) {
          const data = await articlesRes.json();
          setArticleStatuses(data);
          setHasData(true);
        }

        setShowSuccessToast(true);
        const timer = setTimeout(() => setShowSuccessToast(false), 5000);
      }
    } catch (error) {
      console.error("Error importing assessment from localStorage:", error);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-white/[0.05] rounded w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-white/[0.05] rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-slate-100 dark:bg-white/[0.04] rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/20 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-[14px] text-green-800 dark:text-white font-medium">
              Assessment imported successfully!
            </span>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="text-green-600 dark:text-white/70 hover:text-green-800 dark:hover:text-white/80 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1200px]">
        {/* Pending Assessment Import Banner */}
        {pendingAssessment && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-medium text-emerald-900 dark:text-white mb-1">
                  Assessment results available
                </h3>
                <p className="text-[13px] text-emerald-700 dark:text-white/70">
                  Import your compliance assessment to populate your dashboard
                  automatically. Completed{" "}
                  {new Date(pendingAssessment.completedAt).toLocaleDateString()}
                  .
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleImportFromLocalStorage}
                  disabled={importing}
                  className="inline-flex items-center gap-2 bg-emerald-600 dark:bg-emerald-500 text-white text-[12px] font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Assessment"
                  )}
                </button>
                <button
                  onClick={handleDismissPendingAssessment}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 p-1 rounded transition-colors"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-[24px] font-medium text-slate-900 dark:text-white mb-1">
            Welcome back, {firstName}
          </h1>
          <p className="text-[14px] text-slate-600 dark:text-white/70">
            EU Space Act compliance overview
          </p>
        </div>

        {/* Import CTA */}
        {!hasData && (
          <div className="bg-slate-50 dark:bg-white/[0.04] border border-dashed border-slate-300 dark:border-white/[0.08] rounded-xl p-10 text-center mb-10">
            <h2 className="text-[16px] font-medium text-slate-900 dark:text-white mb-2">
              Import your assessment results
            </h2>
            <p className="text-[13px] text-slate-600 dark:text-white/70 mb-6">
              Run the free assessment to determine which articles apply to your
              operation.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/assessment"
                className="border border-slate-300 dark:border-white/[0.1] text-slate-700 dark:text-white/60 font-mono text-[12px] px-5 py-2.5 rounded-full hover:border-slate-400 dark:hover:border-white/[0.2] hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-2"
              >
                <PlayCircle size={14} />
                Run Assessment
              </Link>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-white/60 font-mono text-[12px] px-5 py-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-all"
              >
                I already ran it
              </button>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/[0.08] rounded-xl p-8 max-w-[400px] w-full shadow-xl">
              <h2 className="text-[18px] font-medium text-slate-900 dark:text-white mb-2">
                Select Operator Type
              </h2>
              <p className="text-[13px] text-slate-600 dark:text-white/70 mb-6">
                Choose your operator type to import applicable articles.
              </p>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white rounded-lg px-4 py-3 text-[14px] mb-6 focus:outline-none focus:border-slate-400 dark:focus:border-white/[0.15]"
              >
                <option value="">Select operator type...</option>
                <option value="SCO">EU Spacecraft Operator</option>
                <option value="LO">EU Launch Operator</option>
                <option value="LSO">EU Launch Site Operator</option>
                <option value="TCO">Third Country Operator</option>
                <option value="ISOS">In-Space Services Provider</option>
                <option value="PDP">Primary Data Provider</option>
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/60 py-2.5 rounded-lg font-mono text-[12px] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedOperator || importing}
                  className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-black py-2.5 rounded-lg font-medium text-[13px] hover:bg-slate-800 dark:hover:bg-white/90 transition-all disabled:opacity-50"
                >
                  {importing ? "Importing..." : "Import"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <p className="text-[36px] font-mono font-semibold text-slate-900 dark:text-white">
              {progressPercent}%
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              articles compliant
            </p>
            <div className="h-1 bg-slate-100 dark:bg-white/[0.04] rounded-full mt-4">
              <div
                className="h-full bg-slate-900 dark:bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <p className="text-[36px] font-mono font-semibold text-slate-900 dark:text-white">
              {hasData ? stats.applicable : "—"}
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              {hasData ? "applicable articles" : "run assessment first"}
            </p>
          </div>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <p className="text-[36px] font-mono font-semibold text-slate-900 dark:text-white">
              {documentCount}
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              {documentCount === 1 ? "document" : "documents"} uploaded
            </p>
          </div>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <p className="text-[36px] font-mono font-semibold text-slate-900 dark:text-white">
              {daysUntilEnforcement}
            </p>
            <p className="font-mono text-[11px] text-slate-500 dark:text-white/60 mt-1">
              until 01.01.2030
            </p>
          </div>
        </div>

        {/* Module Rows */}
        <div className="mb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-6">
            COMPLIANCE MODULES
          </p>
          <div className="flex flex-col gap-3">
            {modules.map((mod) => {
              const prog = moduleProgress[mod.id];
              const progressWidth =
                prog.total > 0 ? (prog.compliant / prog.total) * 100 : 0;
              return (
                <Link
                  key={mod.id}
                  href={moduleRoutes[mod.id] || "/dashboard/tracker"}
                  className="bg-white dark:bg-white/[0.015] border border-slate-200 dark:border-white/10 rounded-lg px-6 py-5 hover:border-slate-300 dark:hover:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[12px] text-slate-400 dark:text-white/30 w-6">
                        {mod.number}
                      </span>
                      <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                        {mod.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-white/60">
                        {mod.articleRange}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 px-3 py-1 rounded-full">
                        {prog.status}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-slate-400 dark:text-white/30 group-hover:text-slate-600 dark:group-hover:text-white/70 transition-colors"
                      />
                    </div>
                  </div>
                  {prog.total > 0 && (
                    <div className="h-0.5 bg-slate-100 dark:bg-white/[0.04] rounded-full ml-10">
                      <div
                        className="h-full bg-slate-400 dark:bg-white/30 rounded-full transition-all duration-500"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-6">
            RECENT ACTIVITY
          </p>
          <div className="bg-white dark:bg-white/[0.015] border border-slate-200 dark:border-white/10 rounded-xl p-6">
            <ActivityFeed
              limit={10}
              showFilters={false}
              showExport={false}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 lg:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-white/[0.05] rounded w-1/3" />
            <div className="h-4 bg-slate-200 dark:bg-white/[0.05] rounded w-1/2" />
            <div className="grid grid-cols-4 gap-4 mt-8">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-slate-100 dark:bg-white/[0.04] rounded-xl"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
