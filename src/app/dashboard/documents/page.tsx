"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  Folder,
  FileCheck,
  Award,
  Shield,
  Settings,
  FileSignature,
  Building2,
  X,
  Eye,
  ShieldCheck,
  BarChart3,
  Plus,
} from "lucide-react";
import dynamic from "next/dynamic";
import FileUploader from "@/components/documents/FileUploader";
import { csrfHeaders } from "@/lib/csrf-client";

const DocumentViewer = dynamic(
  () => import("@/components/documents/DocumentViewer"),
  { ssr: false },
);
import {
  categoryDisplayInfo,
  getExpiryStatus,
  getDaysUntilExpiry,
  formatFileSize,
  getStatusColor,
} from "@/data/document-vault";

type Tab = "overview" | "upload" | "expiry-tracker" | "compliance-check";

interface Document {
  id: string;
  name: string;
  description: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  status: string;
  issueDate: string | null;
  expiryDate: string | null;
  isExpired: boolean;
  moduleType: string | null;
  regulatoryRef: string | null;
  accessLevel: string;
  version: number;
  createdAt: string;
}

interface DashboardStats {
  total: number;
  expired: number;
  expiringThisMonth: number;
  expiringNext90Days: number;
  draft: number;
  active: number;
  completeness: number;
}

interface ModuleCompliance {
  module: string;
  required: number;
  present: number;
  completeness: number;
  missing: {
    category: string;
    name: string;
    criticality: string;
    regulatoryRef?: string;
  }[];
}

// ─── Glass Styles (matching Generate2Page) ───

const glassPanel: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  borderRadius: 20,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
  overflow: "hidden",
};

const innerGlass: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.45)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  borderRadius: 14,
  boxShadow:
    "0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
};

const glassPanelDarkClass =
  "dark:!bg-white/[0.04] dark:!backdrop-blur-[40px] dark:!border-white/[0.08] dark:![box-shadow:0_8px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]";
const innerGlassDarkClass =
  "dark:!bg-white/[0.03] dark:!border-white/[0.06] dark:![box-shadow:0_2px_8px_rgba(0,0,0,0.15)] dark:!backdrop-blur-none";

// ─── Tab Definitions ───

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "All Documents", icon: <Folder size={16} /> },
  { id: "upload", label: "Upload", icon: <Upload size={16} /> },
  {
    id: "expiry-tracker",
    label: "Expiry Tracker",
    icon: <Clock size={16} />,
  },
  {
    id: "compliance-check",
    label: "Compliance",
    icon: <ShieldCheck size={16} />,
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  LICENSE: <FileCheck size={15} />,
  PERMIT: <FileCheck size={15} />,
  AUTHORIZATION: <FileCheck size={15} />,
  CERTIFICATE: <Award size={15} />,
  ISO_CERTIFICATE: <Award size={15} />,
  SECURITY_CERT: <Shield size={15} />,
  INSURANCE_POLICY: <Shield size={15} />,
  INSURANCE_CERT: <Shield size={15} />,
  COMPLIANCE_REPORT: <FileText size={15} />,
  AUDIT_REPORT: <FileText size={15} />,
  INCIDENT_REPORT: <AlertTriangle size={15} />,
  ANNUAL_REPORT: <FileText size={15} />,
  TECHNICAL_SPEC: <Settings size={15} />,
  DESIGN_DOC: <FileText size={15} />,
  CONTRACT: <FileSignature size={15} />,
  NDA: <FileSignature size={15} />,
  REGULATORY_FILING: <Building2 size={15} />,
  POLICY: <FileText size={15} />,
  OTHER: <FileText size={15} />,
};

// ─── Input class (glass style) ───

const inputClass =
  "w-full bg-white/40 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all";

const selectClass =
  "w-full bg-white/40 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all appearance-none";

// ─── Page Content ───

function DocumentsPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<Document[]>([]);
  const [expiredDocuments, setExpiredDocuments] = useState<Document[]>([]);
  const [moduleCompliance, setModuleCompliance] = useState<ModuleCompliance[]>(
    [],
  );
  const [overallCompleteness, setOverallCompleteness] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    category: "LICENSE",
    subcategory: "",
    moduleType: "",
    issueDate: "",
    expiryDate: "",
    regulatoryRef: "",
    accessLevel: "INTERNAL",
    tags: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "compliance-check") {
      fetchComplianceCheck();
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [dashboardRes, docsRes] = await Promise.all([
        fetch("/api/documents/dashboard"),
        fetch("/api/documents?limit=50"),
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setStats(data.stats);
        setExpiringDocuments(data.expiringDocuments || []);
        setExpiredDocuments(data.expiredDocuments || []);
      }

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching document data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplianceCheck = async () => {
    try {
      const res = await fetch("/api/documents/compliance-check");
      if (res.ok) {
        const data = await res.json();
        setModuleCompliance(data.moduleCompliance || []);
        setOverallCompleteness(data.overallCompleteness || 0);
      }
    } catch (error) {
      console.error("Error fetching compliance check:", error);
    }
  };

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    resetUploadForm();
    fetchData();
  };

  const resetUploadForm = () => {
    setUploadForm({
      name: "",
      description: "",
      category: "LICENSE",
      subcategory: "",
      moduleType: "",
      issueDate: "",
      expiryDate: "",
      regulatoryRef: "",
      accessLevel: "INTERNAL",
      tags: "",
    });
  };

  const handleDownload = async (doc: Document) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.downloadUrl, "_blank");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const documentsByCategory = filteredDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) acc[doc.category] = [];
      acc[doc.category].push(doc);
      return acc;
    },
    {} as Record<string, Document[]>,
  );

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-white/[0.55]">
            Loading Document Vault...
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent p-3 gap-3">
      {/* ─── Left Panel — Navigation + Stats ─── */}
      <div
        className={`w-[260px] shrink-0 flex flex-col ${glassPanelDarkClass}`}
        style={glassPanel}
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Document Vault
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Secure compliance document storage
          </p>
        </div>

        {/* Tab Navigation */}
        <nav className="px-3 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-black/[0.06] dark:border-white/10" />

        {/* Stats Summary */}
        {stats && (
          <div className="px-4 space-y-2 flex-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium px-1 mb-1.5">
              Quick Stats
            </p>
            <StatRow
              icon={<FileText size={14} />}
              label="Total Documents"
              value={stats.total}
              color="text-slate-700 dark:text-slate-200"
            />
            <StatRow
              icon={<CheckCircle2 size={14} />}
              label="Active"
              value={stats.active}
              color="text-green-600"
            />
            <StatRow
              icon={<AlertTriangle size={14} />}
              label="Expired"
              value={stats.expired}
              color={stats.expired > 0 ? "text-red-500" : "text-slate-400"}
            />
            <StatRow
              icon={<Clock size={14} />}
              label="Expiring Soon"
              value={stats.expiringThisMonth}
              color={
                stats.expiringThisMonth > 0
                  ? "text-amber-500"
                  : "text-slate-400"
              }
            />

            {/* Completeness Ring */}
            <div
              className={`mt-4 rounded-xl p-3 ${innerGlassDarkClass}`}
              style={innerGlass}
            >
              <div className="flex items-center gap-3">
                <CompletenessRing value={stats.completeness} size={44} />
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Completeness
                  </p>
                  <p className="text-lg font-semibold text-slate-800 dark:text-white">
                    {stats.completeness}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Upload Document
          </button>
        </div>
      </div>

      {/* ─── Main Content Panel ─── */}
      <div
        className={`flex-1 min-w-0 flex flex-col ${glassPanelDarkClass}`}
        style={glassPanel}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {activeTab === "overview" && (
              <OverviewTab
                documents={filteredDocuments}
                documentsByCategory={documentsByCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                onView={setViewingDocument}
                onDownload={handleDownload}
                onUpload={() => setShowUploadModal(true)}
              />
            )}
            {activeTab === "upload" && (
              <UploadTab
                uploadForm={uploadForm}
                onFormChange={setUploadForm}
                onComplete={() => {
                  resetUploadForm();
                  setActiveTab("overview");
                  fetchData();
                }}
                onCancel={() => setActiveTab("overview")}
              />
            )}
            {activeTab === "expiry-tracker" && (
              <ExpiryTab
                expiredDocuments={expiredDocuments}
                expiringDocuments={expiringDocuments}
                onUpload={() => setShowUploadModal(true)}
              />
            )}
            {activeTab === "compliance-check" && (
              <ComplianceTab
                overallCompleteness={overallCompleteness}
                moduleCompliance={moduleCompliance}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Upload Modal ─── */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            uploadForm={uploadForm}
            onFormChange={setUploadForm}
            onComplete={handleUploadComplete}
            onClose={() => setShowUploadModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Document Viewer ─── */}
      {viewingDocument && (
        <DocumentViewer
          documentId={viewingDocument.id}
          fileName={viewingDocument.fileName}
          mimeType={viewingDocument.mimeType}
          onClose={() => setViewingDocument(null)}
          onDownload={() => handleDownload(viewingDocument)}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ───

function OverviewTab({
  documents,
  documentsByCategory,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onView,
  onDownload,
  onUpload,
}: {
  documents: Document[];
  documentsByCategory: Record<string, Document[]>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string | null;
  onCategoryChange: (c: string | null) => void;
  onView: (d: Document) => void;
  onDownload: (d: Document) => void;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header with search */}
      <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-white/40 border border-black/[0.06] rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all dark:bg-white/5 dark:text-white dark:border-white/10"
            />
          </div>
          <select
            value={selectedCategory || ""}
            onChange={(e) => onCategoryChange(e.target.value || null)}
            className="bg-white/40 border border-black/[0.06] rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
          >
            <option value="">All Categories</option>
            {categoryDisplayInfo.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {Object.keys(documentsByCategory).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${innerGlassDarkClass}`}
              style={innerGlass}
            >
              <FileText size={24} className="text-slate-400" />
            </div>
            <h3 className="text-base font-medium text-slate-600 dark:text-slate-300">
              No documents yet
            </h3>
            <p className="text-sm text-slate-400 mt-1.5 max-w-sm">
              Upload your first compliance document to start building your
              regulatory vault.
            </p>
            <button
              onClick={onUpload}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              <Upload size={15} />
              Upload Document
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(documentsByCategory).map(([category, docs]) => {
              const catInfo = categoryDisplayInfo.find(
                (c) => c.id === category,
              );
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${catInfo?.color || "#6b7280"}18`,
                      }}
                    >
                      <span style={{ color: catInfo?.color || "#6b7280" }}>
                        {categoryIcons[category] || <FileText size={13} />}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {catInfo?.label || category}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">
                      {docs.length}
                    </span>
                  </div>
                  <div
                    className={`rounded-xl overflow-hidden ${innerGlassDarkClass}`}
                    style={innerGlass}
                  >
                    {docs.map((doc, idx) => (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between px-4 py-3 hover:bg-white/40 dark:hover:bg-white/5 transition-colors ${
                          idx !== docs.length - 1
                            ? "border-b border-black/[0.04] dark:border-white/5"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-slate-400">
                            {categoryIcons[doc.category] || (
                              <FileText size={15} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400">
                                {formatFileSize(doc.fileSize)}
                              </span>
                              {doc.regulatoryRef && (
                                <span className="text-xs text-slate-400">
                                  {doc.regulatoryRef}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <ExpiryBadge expiryDate={doc.expiryDate} />
                          <StatusBadge status={doc.status} />
                          <button
                            onClick={() => onView(doc)}
                            className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 transition-colors"
                            aria-label={`View ${doc.name}`}
                          >
                            <Eye size={14} className="text-slate-400" />
                          </button>
                          <button
                            onClick={() => onDownload(doc)}
                            className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 transition-colors"
                            aria-label={`Download ${doc.name}`}
                          >
                            <Download size={14} className="text-slate-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upload Tab ───

type UploadFormState = {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  moduleType: string;
  issueDate: string;
  expiryDate: string;
  regulatoryRef: string;
  accessLevel: string;
  tags: string;
};

function UploadTab({
  uploadForm,
  onFormChange,
  onComplete,
  onCancel,
}: {
  uploadForm: UploadFormState;
  onFormChange: (form: UploadFormState) => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
            Upload New Document
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Add metadata and upload your compliance document.
          </p>
        </div>

        <div
          className={`rounded-xl p-5 space-y-5 ${innerGlassDarkClass}`}
          style={innerGlass}
        >
          {/* Metadata Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Document Name *">
              <input
                type="text"
                value={uploadForm.name}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, name: e.target.value })
                }
                className={inputClass}
                placeholder="e.g., Space Activity License"
              />
            </FormField>
            <FormField label="Category *">
              <select
                value={uploadForm.category}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, category: e.target.value })
                }
                className={selectClass}
              >
                {categoryDisplayInfo.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Issue Date">
              <input
                type="date"
                value={uploadForm.issueDate}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, issueDate: e.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Expiry Date">
              <input
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, expiryDate: e.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Linked Module">
              <select
                value={uploadForm.moduleType}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, moduleType: e.target.value })
                }
                className={selectClass}
              >
                <option value="">None</option>
                <option value="AUTHORIZATION">Authorization</option>
                <option value="DEBRIS">Debris Mitigation</option>
                <option value="CYBERSECURITY">Cybersecurity</option>
                <option value="INSURANCE">Insurance</option>
                <option value="ENVIRONMENTAL">Environmental</option>
                <option value="SUPERVISION">Supervision</option>
              </select>
            </FormField>
            <FormField label="Regulatory Reference">
              <input
                type="text"
                value={uploadForm.regulatoryRef}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, regulatoryRef: e.target.value })
                }
                className={inputClass}
                placeholder="e.g., EU Space Act Art. 18"
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Description">
                <textarea
                  value={uploadForm.description}
                  onChange={(e) =>
                    onFormChange({
                      ...uploadForm,
                      description: e.target.value,
                    })
                  }
                  className={`${inputClass} h-20 resize-none`}
                  placeholder="Optional description"
                />
              </FormField>
            </div>
          </div>

          {/* File Uploader */}
          <FileUploader
            onUploadComplete={onComplete}
            onCancel={onCancel}
            metadata={{
              name: uploadForm.name,
              description: uploadForm.description || undefined,
              category: uploadForm.category,
              subcategory: uploadForm.subcategory || undefined,
              moduleType: uploadForm.moduleType || undefined,
              issueDate: uploadForm.issueDate || undefined,
              expiryDate: uploadForm.expiryDate || undefined,
              regulatoryRef: uploadForm.regulatoryRef || undefined,
              accessLevel: uploadForm.accessLevel,
              tags: uploadForm.tags
                ? uploadForm.tags.split(",").map((t) => t.trim())
                : [],
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Expiry Tracker Tab ───

function ExpiryTab({
  expiredDocuments,
  expiringDocuments,
  onUpload,
}: {
  expiredDocuments: Document[];
  expiringDocuments: Document[];
  onUpload: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Expired Documents */}
      {expiredDocuments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <AlertTriangle size={15} className="text-red-500" />
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              Expired Documents
            </span>
            <span className="ml-auto text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              {expiredDocuments.length}
            </span>
          </div>
          <div
            className="rounded-xl overflow-hidden border border-red-500/10"
            style={{
              ...innerGlass,
              background: "rgba(239, 68, 68, 0.04)",
            }}
          >
            {expiredDocuments.map((doc, idx) => (
              <div
                key={doc.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  idx !== expiredDocuments.length - 1
                    ? "border-b border-red-500/10"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-red-400">
                    {categoryIcons[doc.category] || <FileText size={15} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Expired: {new Date(doc.expiryDate!).toLocaleDateString()}
                      {doc.regulatoryRef && ` | ${doc.regulatoryRef}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onUpload}
                  className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Upload New Version
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Clock size={15} className="text-amber-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Expiring in Next 90 Days
          </span>
        </div>
        {expiringDocuments.length === 0 ? (
          <div
            className={`rounded-xl p-8 text-center ${innerGlassDarkClass}`}
            style={innerGlass}
          >
            <CheckCircle2
              size={36}
              className="mx-auto text-emerald-500/50 mb-3"
            />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No documents expiring soon
            </p>
            <p className="text-xs text-slate-400 mt-1">
              All your documents are up to date
            </p>
          </div>
        ) : (
          <div
            className={`rounded-xl overflow-hidden ${innerGlassDarkClass}`}
            style={innerGlass}
          >
            {expiringDocuments.map((doc, idx) => {
              const days = getDaysUntilExpiry(new Date(doc.expiryDate!));
              const isUrgent = days !== null && days <= 30;
              return (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    idx !== expiringDocuments.length - 1
                      ? "border-b border-black/[0.04] dark:border-white/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: isUrgent
                          ? "rgba(249, 115, 22, 0.1)"
                          : "rgba(234, 179, 8, 0.1)",
                      }}
                    >
                      <span
                        className={
                          isUrgent ? "text-orange-500" : "text-amber-500"
                        }
                      >
                        {categoryIcons[doc.category] || <FileText size={14} />}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {doc.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {
                          categoryDisplayInfo.find((c) => c.id === doc.category)
                            ?.label
                        }
                        {doc.regulatoryRef && ` | ${doc.regulatoryRef}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span
                        className={`text-sm font-semibold ${
                          isUrgent ? "text-orange-500" : "text-amber-500"
                        }`}
                      >
                        {days} days
                      </span>
                      <p className="text-xs text-slate-400">
                        {new Date(doc.expiryDate!).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={onUpload}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 bg-white/50 dark:bg-white/10 hover:bg-white/70 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Renew
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compliance Check Tab ───

function ComplianceTab({
  overallCompleteness,
  moduleCompliance,
}: {
  overallCompleteness: number;
  moduleCompliance: ModuleCompliance[];
}) {
  const barColor =
    overallCompleteness >= 80
      ? "bg-emerald-500"
      : overallCompleteness >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Overall Completeness */}
      <div
        className={`rounded-xl p-5 ${innerGlassDarkClass}`}
        style={innerGlass}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">
              Overall Compliance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Document completeness across all modules
            </p>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {overallCompleteness}%
          </div>
        </div>
        <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-2">
          <motion.div
            className={`h-2 rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${overallCompleteness}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Module Cards */}
      <div className="space-y-3">
        {moduleCompliance.map((module) => {
          const modColor =
            module.completeness >= 100
              ? "emerald"
              : module.completeness >= 50
                ? "amber"
                : "red";
          return (
            <div
              key={module.module}
              className={`rounded-xl p-4 ${innerGlassDarkClass}`}
              style={innerGlass}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      modColor === "emerald"
                        ? "bg-emerald-500/10"
                        : modColor === "amber"
                          ? "bg-amber-500/10"
                          : "bg-red-500/10"
                    }`}
                  >
                    {module.completeness >= 100 ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <BarChart3
                        size={16}
                        className={
                          modColor === "amber"
                            ? "text-amber-500"
                            : "text-red-500"
                        }
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {module.module}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {module.present} of {module.required} required
                    </p>
                  </div>
                </div>
                <span
                  className={`text-base font-semibold ${
                    modColor === "emerald"
                      ? "text-emerald-500"
                      : modColor === "amber"
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}
                >
                  {module.completeness}%
                </span>
              </div>

              <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-1.5 mb-2">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    modColor === "emerald"
                      ? "bg-emerald-500"
                      : modColor === "amber"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(module.completeness, 100)}%`,
                  }}
                />
              </div>

              {module.missing.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-black/[0.04] dark:border-white/5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                    Missing documents
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {module.missing.map((doc, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded-md bg-red-500/8 text-red-500 dark:text-red-400 border border-red-500/10"
                      >
                        {doc.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upload Modal ───

function UploadModal({
  uploadForm,
  onFormChange,
  onComplete,
  onClose,
}: {
  uploadForm: UploadFormState;
  onFormChange: (form: UploadFormState) => void;
  onComplete: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-label="Upload document"
        aria-modal="true"
        className="max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        style={{
          ...glassPanel,
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(32px) saturate(1.5)",
          WebkitBackdropFilter: "blur(32px) saturate(1.5)",
        }}
      >
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Upload Document
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Fill in metadata and upload your file
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/[0.04] transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Document Name *">
              <input
                type="text"
                value={uploadForm.name}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, name: e.target.value })
                }
                className={inputClass}
                placeholder="e.g., Space Activity License"
              />
            </FormField>
            <FormField label="Category *">
              <select
                value={uploadForm.category}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, category: e.target.value })
                }
                className={selectClass}
              >
                {categoryDisplayInfo.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Issue Date">
              <input
                type="date"
                value={uploadForm.issueDate}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, issueDate: e.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Expiry Date">
              <input
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, expiryDate: e.target.value })
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Linked Module">
              <select
                value={uploadForm.moduleType}
                onChange={(e) =>
                  onFormChange({ ...uploadForm, moduleType: e.target.value })
                }
                className={selectClass}
              >
                <option value="">None</option>
                <option value="AUTHORIZATION">Authorization</option>
                <option value="DEBRIS">Debris Mitigation</option>
                <option value="CYBERSECURITY">Cybersecurity</option>
                <option value="INSURANCE">Insurance</option>
                <option value="ENVIRONMENTAL">Environmental</option>
                <option value="SUPERVISION">Supervision</option>
              </select>
            </FormField>
            <FormField label="Regulatory Reference">
              <input
                type="text"
                value={uploadForm.regulatoryRef}
                onChange={(e) =>
                  onFormChange({
                    ...uploadForm,
                    regulatoryRef: e.target.value,
                  })
                }
                className={inputClass}
                placeholder="e.g., EU Space Act Art. 18"
              />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea
              value={uploadForm.description}
              onChange={(e) =>
                onFormChange({ ...uploadForm, description: e.target.value })
              }
              className={`${inputClass} h-20 resize-none`}
              placeholder="Optional description"
            />
          </FormField>

          <FileUploader
            onUploadComplete={onComplete}
            onCancel={onClose}
            metadata={{
              name: uploadForm.name,
              description: uploadForm.description || undefined,
              category: uploadForm.category,
              subcategory: uploadForm.subcategory || undefined,
              moduleType: uploadForm.moduleType || undefined,
              issueDate: uploadForm.issueDate || undefined,
              expiryDate: uploadForm.expiryDate || undefined,
              regulatoryRef: uploadForm.regulatoryRef || undefined,
              accessLevel: uploadForm.accessLevel,
              tags: uploadForm.tags
                ? uploadForm.tags.split(",").map((t) => t.trim())
                : [],
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Shared Micro Components ───

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function CompletenessRing({ value, size }: { value: number; size: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "#10B981" : value >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null;

  const status = getExpiryStatus(new Date(expiryDate));
  const days = getDaysUntilExpiry(new Date(expiryDate));

  if (status === "expired") {
    return (
      <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-red-500/10 text-red-500 border border-red-500/10">
        Expired
      </span>
    );
  }
  if (status === "expiringSoon") {
    return (
      <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/10">
        {days}d left
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/10">
      Valid
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  return (
    <span
      className="px-2 py-0.5 text-[11px] font-medium rounded-md border"
      style={{
        backgroundColor: `${color}12`,
        color: color,
        borderColor: `${color}20`,
      }}
    >
      {status}
    </span>
  );
}

// ─── Page Export ───

export default function DocumentsPage() {
  return (
    <FeatureGate module="documents">
      <DocumentsPageContent />
    </FeatureGate>
  );
}
