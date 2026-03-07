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
  Plus,
  Search,
  Filter,
  Download,
  Share2,
  Folder,
  FileCheck,
  Award,
  Shield,
  Settings,
  FileSignature,
  Building2,
  X,
  ChevronRight,
  ExternalLink,
  Eye,
} from "lucide-react";
import dynamic from "next/dynamic";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FileUploader from "@/components/documents/FileUploader";
import EmptyState from "@/components/dashboard/EmptyState";

// Dynamically import DocumentViewer to avoid SSR issues with react-pdf
const DocumentViewer = dynamic(
  () => import("@/components/documents/DocumentViewer"),
  { ssr: false },
);
import {
  documentCategories,
  categoryDisplayInfo,
  getExpiryStatus,
  getDaysUntilExpiry,
  formatFileSize,
  getStatusColor,
} from "@/data/document-vault";

type Step = "overview" | "upload" | "expiry-tracker" | "compliance-check";

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

const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Folder size={18} /> },
  { id: "upload", label: "Upload", icon: <Upload size={18} /> },
  { id: "expiry-tracker", label: "Expiry Tracker", icon: <Clock size={18} /> },
  {
    id: "compliance-check",
    label: "Compliance Check",
    icon: <CheckCircle2 size={18} />,
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  LICENSE: <FileCheck size={16} />,
  PERMIT: <FileCheck size={16} />,
  AUTHORIZATION: <FileCheck size={16} />,
  CERTIFICATE: <Award size={16} />,
  ISO_CERTIFICATE: <Award size={16} />,
  SECURITY_CERT: <Shield size={16} />,
  INSURANCE_POLICY: <Shield size={16} />,
  INSURANCE_CERT: <Shield size={16} />,
  COMPLIANCE_REPORT: <FileText size={16} />,
  AUDIT_REPORT: <FileText size={16} />,
  INCIDENT_REPORT: <AlertTriangle size={16} />,
  ANNUAL_REPORT: <FileText size={16} />,
  TECHNICAL_SPEC: <Settings size={16} />,
  DESIGN_DOC: <FileText size={16} />,
  CONTRACT: <FileSignature size={16} />,
  NDA: <FileSignature size={16} />,
  REGULATORY_FILING: <Building2 size={16} />,
  POLICY: <FileText size={16} />,
  OTHER: <FileText size={16} />,
};

function DocumentsPageContent() {
  const [activeStep, setActiveStep] = useState<Step>("overview");
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

  // Upload form state
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
    if (activeStep === "compliance-check") {
      fetchComplianceCheck();
    }
  }, [activeStep]);

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

  const handleUploadComplete = (documentId: string) => {
    setShowUploadModal(false);
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
    fetchData();
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

  const getExpiryBadge = (expiryDate: string | null) => {
    if (!expiryDate) return null;

    const status = getExpiryStatus(new Date(expiryDate));
    const days = getDaysUntilExpiry(new Date(expiryDate));

    if (status === "expired") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--accent-danger-soft)] text-[var(--accent-danger)]">
          Expired
        </span>
      );
    }
    if (status === "expiringSoon") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
          {days} days left
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--accent-success-soft)] text-[var(--accent-primary)]">
        Valid
      </span>
    );
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

  // Group documents by category
  const documentsByCategory = filteredDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) acc[doc.category] = [];
      acc[doc.category].push(doc);
      return acc;
    },
    {} as Record<string, Document[]>,
  );

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-live="polite">
        <div className="h-8 bg-[var(--surface-sunken)] rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-[var(--surface-sunken)] rounded-xl animate-pulse" />
        <span className="sr-only">Loading document vault...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2">
            DOCUMENTS
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Document Vault
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Secure storage for compliance documents and certificates
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload size={16} className="mr-1" />
          Upload Document
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[var(--surface-raised)][0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-primary-soft)]">
                  <FileText
                    size={18}
                    className="text-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">
                    {stats.total}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Total Documents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-[var(--surface-raised)][0.02] ${stats.expired > 0 ? "border-[var(--accent-danger)/30]" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${stats.expired > 0 ? "bg-[var(--accent-danger-soft)]" : "bg-[var(--surface-sunken)]"}`}
                >
                  <AlertTriangle
                    size={18}
                    className={
                      stats.expired > 0
                        ? "text-[var(--accent-danger)]"
                        : "text-[var(--text-tertiary)]"
                    }
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-semibold ${stats.expired > 0 ? "text-[var(--accent-danger)]" : "text-[var(--text-primary)]"}`}
                  >
                    {stats.expired}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Expired
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--surface-raised)][0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">
                    {stats.expiringThisMonth}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Expiring Soon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--surface-raised)][0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-primary-soft)]">
                  <CheckCircle2
                    size={18}
                    className="text-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">
                    {stats.completeness}%
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Completeness
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step Navigation */}
      <div
        className="flex items-center gap-2 p-1 bg-[var(--surface-raised)][0.02] rounded-xl border border-[var(--border-default)]"
        role="tablist"
        aria-label="Document views"
      >
        {steps.map((step) => (
          <button
            key={step.id}
            role="tab"
            aria-selected={activeStep === step.id}
            aria-controls={`tabpanel-${step.id}`}
            onClick={() => setActiveStep(step.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              text-sm font-medium transition-all
              ${
                activeStep === step.id
                  ? "bg-[var(--surface-sunken)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
              }
            `}
          >
            <span aria-hidden="true">{step.icon}</span>
            <span className="hidden md:inline">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview */}
          {activeStep === "overview" && (
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                    aria-hidden="true"
                  />
                  <label htmlFor="doc-search" className="sr-only">
                    Search documents
                  </label>
                  <input
                    id="doc-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg pl-10 pr-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                  />
                </div>
                <label htmlFor="doc-category-filter" className="sr-only">
                  Filter by category
                </label>
                <select
                  id="doc-category-filter"
                  value={selectedCategory || ""}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                >
                  <option value="">All Categories</option>
                  {categoryDisplayInfo.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Documents by Category */}
              {Object.keys(documentsByCategory).length === 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<FileText size={28} />}
                      title="No documents yet"
                      description="Upload your first compliance document to get started with document management."
                      actionLabel="Upload Document"
                      onAction={() => setShowUploadModal(true)}
                    />
                  </CardContent>
                </Card>
              ) : (
                Object.entries(documentsByCategory).map(([category, docs]) => {
                  const catInfo = categoryDisplayInfo.find(
                    (c) => c.id === category,
                  );
                  return (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div
                            className="p-1.5 rounded"
                            style={{
                              backgroundColor: `${catInfo?.color || "#6b7280"}20`,
                            }}
                          >
                            {categoryIcons[category] || <FileText size={16} />}
                          </div>
                          {catInfo?.label || category}
                          <span className="text-[var(--text-tertiary)] text-sm font-normal ml-2">
                            {docs.length} document{docs.length !== 1 ? "s" : ""}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between bg-[var(--surface-raised)][0.02] rounded-lg p-3 hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-[var(--text-secondary)]">
                                {categoryIcons[doc.category] || (
                                  <FileText size={16} />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">
                                  {doc.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    {formatFileSize(doc.fileSize)}
                                  </span>
                                  {doc.regulatoryRef && (
                                    <span className="text-xs text-[var(--text-tertiary)]">
                                      | {doc.regulatoryRef}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getExpiryBadge(doc.expiryDate)}
                              <span
                                className="px-2 py-0.5 text-xs rounded-full"
                                style={{
                                  backgroundColor: `${getStatusColor(doc.status)}20`,
                                  color: getStatusColor(doc.status),
                                }}
                              >
                                {doc.status}
                              </span>
                              <button
                                onClick={() => setViewingDocument(doc)}
                                className="p-1.5 hover:bg-[var(--surface-sunken)] rounded transition-colors"
                                aria-label={`View ${doc.name}`}
                              >
                                <Eye
                                  size={14}
                                  className="text-[var(--text-tertiary)]"
                                  aria-hidden="true"
                                />
                              </button>
                              <button
                                onClick={() => handleDownload(doc)}
                                className="p-1.5 hover:bg-[var(--surface-sunken)] rounded transition-colors"
                                aria-label={`Download ${doc.name}`}
                              >
                                <Download
                                  size={14}
                                  className="text-[var(--text-tertiary)]"
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Upload */}
          {activeStep === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload size={20} />
                  Upload New Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Metadata form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">
                        Document Name *
                      </label>
                      <input
                        type="text"
                        value={uploadForm.name}
                        onChange={(e) =>
                          setUploadForm({ ...uploadForm, name: e.target.value })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                        placeholder="e.g., Space Activity License"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">
                        Category *
                      </label>
                      <select
                        value={uploadForm.category}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            category: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                      >
                        {categoryDisplayInfo.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">
                        Issue Date
                      </label>
                      <input
                        type="date"
                        value={uploadForm.issueDate}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            issueDate: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={uploadForm.expiryDate}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            expiryDate: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">
                        Linked Module
                      </label>
                      <select
                        value={uploadForm.moduleType}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            moduleType: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                      >
                        <option value="">None</option>
                        <option value="AUTHORIZATION">Authorization</option>
                        <option value="DEBRIS">Debris Mitigation</option>
                        <option value="CYBERSECURITY">Cybersecurity</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="ENVIRONMENTAL">Environmental</option>
                        <option value="SUPERVISION">Supervision</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">
                        Regulatory Reference
                      </label>
                      <input
                        type="text"
                        value={uploadForm.regulatoryRef}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            regulatoryRef: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                        placeholder="e.g., EU Space Act Art. 18"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">
                        Description
                      </label>
                      <textarea
                        value={uploadForm.description}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] h-20 resize-none focus:outline-none focus:border-[var(--border-focus)]"
                        placeholder="Optional description"
                      />
                    </div>
                  </div>

                  {/* File Uploader */}
                  <FileUploader
                    onUploadComplete={(docId) => {
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
                      setActiveStep("overview");
                      fetchData();
                    }}
                    onCancel={() => setActiveStep("overview")}
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
              </CardContent>
            </Card>
          )}

          {/* Expiry Tracker */}
          {activeStep === "expiry-tracker" && (
            <div className="space-y-6">
              {/* Expired Documents */}
              {expiredDocuments.length > 0 && (
                <Card className="border-[var(--accent-danger)]/20 bg-[var(--accent-danger)]/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[var(--accent-danger)]">
                      <AlertTriangle size={20} />
                      Expired Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {expiredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-[var(--accent-danger)]/10 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-[var(--accent-danger)]">
                            {categoryIcons[doc.category] || (
                              <FileText size={16} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">
                              {doc.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Expired:{" "}
                              {new Date(doc.expiryDate!).toLocaleDateString()}
                              {doc.regulatoryRef && ` | ${doc.regulatoryRef}`}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="secondary">
                          Upload New Version
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Expiring Soon */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock size={20} />
                    Expiring in Next 90 Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expiringDocuments.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2
                        size={48}
                        className="mx-auto text-[var(--accent-primary)]/50 mb-4"
                      />
                      <p className="text-[var(--text-secondary)]">
                        No documents expiring soon
                      </p>
                      <p className="text-sm text-[var(--text-tertiary)] mt-1">
                        All your documents are up to date
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expiringDocuments.map((doc) => {
                        const days = getDaysUntilExpiry(
                          new Date(doc.expiryDate!),
                        );
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between bg-[var(--surface-raised)][0.02] rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="p-2 rounded-lg"
                                style={{
                                  backgroundColor:
                                    days && days <= 30
                                      ? "rgba(249, 115, 22, 0.1)"
                                      : "rgba(234, 179, 8, 0.1)",
                                }}
                              >
                                {categoryIcons[doc.category] || (
                                  <FileText size={16} />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                  {
                                    categoryDisplayInfo.find(
                                      (c) => c.id === doc.category,
                                    )?.label
                                  }
                                  {doc.regulatoryRef &&
                                    ` | ${doc.regulatoryRef}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span
                                  className={`text-sm font-medium ${
                                    days && days <= 30
                                      ? "text-orange-400"
                                      : "text-[var(--accent-warning)]"
                                  }`}
                                >
                                  {days} days
                                </span>
                                <p className="text-xs text-[var(--text-tertiary)]">
                                  {new Date(
                                    doc.expiryDate!,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <Button size="sm" variant="ghost">
                                Renew
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Compliance Check */}
          {activeStep === "compliance-check" && (
            <div className="space-y-6">
              {/* Overall Completeness */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Overall Compliance
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Document completeness across all modules
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                      {overallCompleteness}%
                    </div>
                  </div>
                  <div className="w-full bg-[var(--surface-sunken)] rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        overallCompleteness >= 80
                          ? "bg-[var(--accent-success-soft)]0"
                          : overallCompleteness >= 50
                            ? "bg-[var(--accent-warning)]"
                            : "bg-[var(--accent-danger)]"
                      }`}
                      style={{ width: `${overallCompleteness}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Module Breakdown */}
              <div className="space-y-4">
                {moduleCompliance.map((module) => (
                  <Card key={module.module}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              module.completeness >= 100
                                ? "bg-[var(--accent-primary-soft)]"
                                : module.completeness >= 50
                                  ? "bg-[var(--accent-warning-soft)]"
                                  : "bg-[var(--accent-danger)]/10"
                            }`}
                          >
                            {module.completeness >= 100 ? (
                              <CheckCircle2
                                size={18}
                                className="text-[var(--accent-primary)]"
                              />
                            ) : (
                              <AlertTriangle
                                size={18}
                                className={
                                  module.completeness >= 50
                                    ? "text-[var(--accent-warning)]"
                                    : "text-[var(--accent-danger)]"
                                }
                              />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-[var(--text-primary)]">
                              {module.module}
                            </h4>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {module.present} of {module.required} required
                              documents
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-lg font-semibold ${
                              module.completeness >= 100
                                ? "text-[var(--accent-primary)]"
                                : module.completeness >= 50
                                  ? "text-[var(--accent-warning)]"
                                  : "text-[var(--accent-danger)]"
                            }`}
                          >
                            {module.completeness}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-[var(--surface-sunken)] rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            module.completeness >= 100
                              ? "bg-[var(--accent-success-soft)]0"
                              : module.completeness >= 50
                                ? "bg-[var(--accent-warning)]"
                                : "bg-[var(--accent-danger)]"
                          }`}
                          style={{
                            width: `${Math.min(module.completeness, 100)}%`,
                          }}
                        />
                      </div>

                      {module.missing.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
                          <p className="text-xs text-[var(--text-tertiary)] mb-2">
                            Missing documents:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {module.missing.map((doc, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs rounded bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]"
                              >
                                {doc.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Upload document"
            aria-modal="true"
            className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Upload Document
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                aria-label="Close dialog"
                className="p-2 hover:bg-[var(--surface-sunken)] rounded-lg transition-colors"
              >
                <X
                  size={16}
                  className="text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Metadata form */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, name: e.target.value })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                    placeholder="e.g., Space Activity License"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Category *
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, category: e.target.value })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                  >
                    {categoryDisplayInfo.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={uploadForm.issueDate}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        issueDate: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={uploadForm.expiryDate}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        expiryDate: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Linked Module
                  </label>
                  <select
                    value={uploadForm.moduleType}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        moduleType: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                  >
                    <option value="">None</option>
                    <option value="AUTHORIZATION">Authorization</option>
                    <option value="DEBRIS">Debris Mitigation</option>
                    <option value="CYBERSECURITY">Cybersecurity</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="ENVIRONMENTAL">Environmental</option>
                    <option value="SUPERVISION">Supervision</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Regulatory Reference
                  </label>
                  <input
                    type="text"
                    value={uploadForm.regulatoryRef}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        regulatoryRef: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                    placeholder="e.g., EU Space Act Art. 18"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] h-20 resize-none focus:outline-none focus:border-[var(--border-focus)]"
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* File Uploader */}
            <FileUploader
              onUploadComplete={handleUploadComplete}
              onCancel={() => setShowUploadModal(false)}
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
      )}

      {/* Document Viewer */}
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

export default function DocumentsPage() {
  return (
    <FeatureGate module="documents">
      <DocumentsPageContent />
    </FeatureGate>
  );
}
